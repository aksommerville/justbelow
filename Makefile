all:
.SILENT:
.SECONDARY:
PRECMD=echo "  $@" ; mkdir -p $(@D) ;

# We use my general games platform `egg` for its minifier.
# https://github.com/aksommerville/egg2
ifeq (,$(EGG_SDK))
  EGG_SDK:=../egg2
endif

SRCFILES:=$(shell find src -type f)

clean:;rm -rf mid out

# Plain `make run` to serve off the source.
# This is preferred for development and troubleshooting.
# We don't generate source maps, so it's the only way to see proper code in the browser's debugger.
run:;http-server -c-1 -p8080 src

OUT_HTML:=out/index.html
OUT_GFX:=out/gfx.png
SRCFILES_HTML:=$(filter %.html %.js,$(SRCFILES))
$(OUT_HTML):$(SRCFILES_HTML);$(PRECMD) $(EGG_SDK)/out/eggdev minify -o$@ src/index.html
$(OUT_GFX):src/gfx.png;$(PRECMD) cp $< $@ # TODO optimize png

OUT_ZIP:=out/justbelow.zip
all:$(OUT_ZIP)
$(OUT_ZIP):$(OUT_HTML) $(OUT_GFX);$(PRECMD) cd out ; rm -f justbelow.zip ; zip justbelow.zip index.html gfx.png ; unzip -l justbelow.zip ; ls -l

# `make run-final` to serve minified, simulating what will happen in production.
# Do this and test manually before any deployment.
run-final:$(OUT_HTML) $(OUT_GFX);http-server -c-1 -p8080 out
