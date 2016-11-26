/* eslint-env mocha */
/* jshint -W030 */

var expect = require('chai').expect
var Resampler = require('../lib/resampler.js')

/**
 * @callback SrcProcessMock
 * @param {number} dataIn - Pointer to input data
 * @param {number} dataOut - Pointer to output data
 * @param {number} inputFrames - Number of input frames
 * @param {number} outputFrames - Number of output frames
 * @param {number} end - Whether this is the last call (truthy value)
 * @param {number} ratio - Conversion ratio
 * @returns {array} [usedInputFrames, usedOuputFrames, returnValue]
 */

/**
 * Mock the _src_process function of the supplied library instance.
 *
 * @param {object} org - Library instance
 * @param {SrcProcessMock} func - Mock function
 */
function lib (org, func) {
  org._src_process = function (state, data) {
    expect(state).to.be.ok
    expect(data).to.be.ok
    var dataIn = org.HEAP32[(data + 0) >> 2]
    var dataOut = org.HEAP32[(data + 4) >> 2]
    var inputFrames = org.HEAP32[(data + 8) >> 2]
    var outputFrames = org.HEAP32[(data + 12) >> 2]
    var end = org.HEAP32[(data + 24) >> 2]
    var ratio = org.HEAPF64[(data + 32) >> 2]
    var result = func(dataIn, dataOut, inputFrames, outputFrames, end, ratio)
    org.HEAP32[(data + 16) >> 2] = result[0]
    org.HEAP32[(data + 20) >> 2] = result[1]
    return result[3]
  }
}

describe('Resampler', function () {
  describe('Resampler()', function () {
    it('should work without new', function () {
      expect(Resampler()).to.be.an.instanceof(Resampler)
    })
    it('should accept 1 or more channels', function () {
      expect(new Resampler({ channels: 1 })).to.be.ok
      expect(new Resampler({ channels: 2 })).to.be.ok
      expect(new Resampler({ channels: 42 })).to.be.ok
    })
    it('should not accept less than 1 channels', function () {
      expect(function () { Resampler({ channels: 0 }) }).to.throw(/channel/)
      expect(function () { Resampler({ channels: -42 }) }).to.throw(/channel/)
    })
    it('should not accept invalid ratio', function () {
      expect(function () { Resampler({ ratio: -1 }) }).to.throw(/ratio/)
      expect(function () { Resampler({ ratio: 0 }) }).to.throw(/ratio/)
      expect(function () { Resampler({ ratio: '123' }) }).to.throw(/ratio/)
      expect(function () { Resampler({ ratio: null }) }).to.throw(/ratio/)
    })
    it('should accept all valid types', function () {
      expect(Resampler({ type: Resampler.Type.SINC_BEST_QUALITY })).to.be.ok
      expect(Resampler({ type: Resampler.Type.SINC_MEDIUM_QUALITY })).to.be.ok
      expect(Resampler({ type: Resampler.Type.SINC_FASTEST })).to.be.ok
      expect(Resampler({ type: Resampler.Type.ZERO_ORDER_HOLD })).to.be.ok
      expect(Resampler({ type: Resampler.Type.LINEAR })).to.be.ok
    })
    it('should not accept invalid type', function () {
      expect(function () { Resampler({ type: 42 }) }).to.throw(/type/)
      expect(function () { Resampler({ type: '123' }) }).to.throw(/type/)
      expect(function () { Resampler({ type: null }) }).to.throw(/type/)
    })
  })
  describe('destroy', function () {
    it('should be a noop when unsafe mode is not enabled', function () {
      Resampler({ unsafe: false }).destroy()
    })
    it('should cleanup when unsafe mode is enabled', function () {
      Resampler({ unsafe: true }).destroy()
      // There isn't actually any good way to check this, so for now
      // we'll just assume that not throwing any error equals success
    })
  })
  describe('_transform', function () {
    describe('mocked library', function () {
      it('should push the output', function () {
        var r = new Resampler({ ratio: 1 })
        lib(r._lib, function (dataIn, dataOut, inputFrames, outputFrames, end, ratio) {
          expect(outputFrames).to.be.greaterThan(inputFrames)
          for (var i = 0; i < inputFrames * 4; i++) {
            r._lib.HEAPU8[dataOut + i] = r._lib.HEAPU8[dataIn + i] + 4
          }
          return [inputFrames, inputFrames, 0]
        })
        r.write(Buffer.from([0, 1, 2, 3]))
        expect(r.read()).to.deep.equal(Buffer.from([4, 5, 6, 7]))
      })
    })
    describe('zero order hold', function () {
      var inputSamples = 64
      var inputBuffer = Buffer.alloc(inputSamples * 4);
      [1, 0.5, 2, 0.6666666666, 1.3333333333].forEach(function (ratio) {
        describe('conversion factor of ' + ratio, function () {
          it('should output approximately the right amount', function () {
            var r = new Resampler({ type: Resampler.Type.ZERO_ORDER_HOLD, ratio: ratio })
            r.write(inputBuffer)
            expect(r.read().length / 4).to.be.closeTo(Math.floor(inputSamples * ratio), 1)
          })
        })
      })
    })
  })
})
