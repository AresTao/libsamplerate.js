/* global Module */
module.exports = function () {
  return Module({ENVIRONMENT: 'WEB'})
}
module.exports.instance = module.exports()
