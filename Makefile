OUTPUT_DIR=./build
EMCC_OPTS=-O3 --llvm-lto 1 --memory-init-file 0 --closure 1 -s NO_FILESYSTEM=1 -s MODULARIZE=1
EXPORTS:='_free','_malloc','_src_new','_src_delete','_src_process','_src_set_ratio','_src_strerror'

SHA512SUM=78596657963cbf06785e3e6e1190b093df71da52ca340e75bd8246a962cd79dd1c90fa5527c607cebcb296e2c1ee605015278b274e3b768f2f3fbeb0eadfb728

LIBSAMPLERATE_VERSION=0.1.9
LIBSAMPLERATE_URL=http://www.mega-nerd.com/SRC/libsamplerate-$(LIBSAMPLERATE_VERSION).tar.gz

LIBSAMPLERATE_TAR=./libsamplerate-$(LIBSAMPLERATE_VERSION).tar.gz
LIBSAMPLERATE_DIR=./libsamplerate-$(LIBSAMPLERATE_VERSION)
LIBSAMPLERATE_OBJ=$(LIBSAMPLERATE_DIR)/src/.libs/libsamplerate.a

POST_JS=./lib/post.js
LIBSAMPLERATE_JS=$(OUTPUT_DIR)/libsamplerate.js

default: $(LIBSAMPLERATE_JS)

clean:
	rm -rf $(OUTPUT_DIR) $(LIBSAMPLERATE_DIR) $(LIBSAMPLERATE_TAR)
	mkdir $(OUTPUT_DIR)

.PHONY: clean default

$(LIBSAMPLERATE_TAR): $(LIBSAMPLERATE_SIG)
	curl $(LIBSAMPLERATE_URL) -o $(LIBSAMPLERATE_TAR)

$(LIBSAMPLERATE_DIR): $(LIBSAMPLERATE_TAR)
	echo "$(SHA512SUM) $(LIBSAMPLERATE_TAR)" | sha512sum -c
	tar xf $(LIBSAMPLERATE_TAR)

$(LIBSAMPLERATE_OBJ): $(LIBSAMPLERATE_DIR)
	cd $(LIBSAMPLERATE_DIR); emconfigure ./configure
	cd $(LIBSAMPLERATE_DIR); emmake make

$(LIBSAMPLERATE_JS): $(LIBSAMPLERATE_OBJ) $(POST_JS)
	emcc -o $@ $(EMCC_OPTS) -s EXPORTED_FUNCTIONS="[$(EXPORTS)]" $(LIBSAMPLERATE_OBJ)
	cat $(POST_JS) >> $(LIBSAMPLERATE_JS)
	# So, there is a bug in static-module (used by brfs) which causes it to fail
	# when trying to parse our generated output for the require('fs') calls
	# Because we won't be using the file system anyway, we monkey patch that call
	sed -i'' 's/require("fs")/null/g' $(LIBSAMPLERATE_JS)
