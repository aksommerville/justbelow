all_and_show_size:
all:
.SILENT:
.SECONDARY:
PRECMD=echo "  $@" ; mkdir -p $(@D) ;

ifeq ($(MAKECMDGOALS),clean)

clean:;rm -rf mid out src/js13k/*.bs

else

# We use my general games platform `egg` for its minifier.
# Also it gives us the general toolchain config, just a convenience.
# https://github.com/aksommerville/egg2
ifeq (,$(EGG_SDK))
  EGG_SDK:=../egg2
endif
include $(EGG_SDK)/local/config.mk
CC:=$($(EGG_NATIVE_TARGET)_CC) -I$(EGG_SDK)/src
LD:=$($(EGG_NATIVE_TARGET)_LD)
LDPOST:=$($(EGG_NATIVE_TARGET)_LDPOST) $(EGG_SDK)/out/$(EGG_NATIVE_TARGET)/libeggrt-headless.a

SRCFILES:=$(shell find src -type f)

# ----- custom tool -----

TOOL_SRCDIR:=src/tool
TOOL_MIDDIR:=mid/tool
TOOL_EXE:=out/tool
TOOL_CFILES:=$(filter $(TOOL_SRCDIR)/%.c,$(SRCFILES))
TOOL_OFILES:=$(patsubst $(TOOL_SRCDIR)/%.c,$(TOOL_MIDDIR)/%.o,$(TOOL_CFILES))
-include $(TOOL_OFILES:.o=.d)
$(TOOL_MIDDIR)/%.o:$(TOOL_SRCDIR)/%.c;$(PRECMD) $(CC) -o$@ $<

# libeggrt-headless gives us serial and image, but alas not midi. So we need to compile that ourselves.
EGG_CFILES:=$(shell find $(EGG_SDK)/src/opt/midi -name '*.c')
EGG_OFILES:=$(patsubst $(EGG_SDK)/src/opt/%.c,$(TOOL_MIDDIR)/opt/%.o,$(EGG_CFILES))
$(TOOL_MIDDIR)/opt/%.o:$(EGG_SDK)/src/opt/%.c;$(PRECMD) $(CC) -o$@ $<

$(TOOL_EXE):$(TOOL_OFILES) $(EGG_OFILES);$(PRECMD) $(LD) -o$@ $^ $(LDPOST)

# ----- js13k edition -----

JS13K_SRCDIR:=src/js13k
JS13K_MIDDIR:=mid/js13k
JS13K_ZIP:=out/justbelow-js13k.zip
JS13K_MIN_SRC:=$(filter $(JS13K_SRCDIR)/%.js $(JS13K_SRCDIR)/%.html,$(SRCFILES))
JS13K_HTML_MID:=$(JS13K_MIDDIR)/index.html
JS13K_DATA_SRC:=$(filter $(JS13K_SRCDIR)/%.png,$(SRCFILES))
JS13K_DATA_MID:=$(patsubst $(JS13K_SRCDIR)/%,$(JS13K_MIDDIR)/%,$(JS13K_DATA_SRC))
all:$(JS13K_ZIP)

# MIDI files are a little weird: We put the output ".bs" file under src, so we can serve the app locally with unminified javascript.
JS13K_MIDI_SRC:=$(filter $(JS13K_SRCDIR)/%.mid,$(SRCFILES))
JS13K_MIDI_DST:=$(patsubst %.mid,%.bs,$(JS13K_MIDI_SRC))
$(JS13K_SRCDIR)/%.bs:$(JS13K_SRCDIR)/%.mid $(TOOL_EXE);$(PRECMD) $(TOOL_EXE) -o$@ $<
JS13K_DATA_MID+=$(patsubst $(JS13K_SRCDIR)/%,$(JS13K_MIDDIR)/%,$(JS13K_MIDI_DST))

# Egg minifies and packs all HTML and Javascript for us.
$(JS13K_HTML_MID):$(JS13K_MIN_SRC);$(PRECMD) $(EGG_SDK)/out/eggdev minify -o$@ $(JS13K_SRCDIR)/index.html

# Data files copy in general, but our custom tool gets to take a crack at them along the way.
$(JS13K_MIDDIR)/%:$(JS13K_SRCDIR)/% $(TOOL_EXE);$(PRECMD) $(TOOL_EXE) -o$@ $<

# And a plain ZIP file at the end, with everything at its root.
# We also dump the size of everything after this step, since we surely want to know that. It's a size coding contest.
$(JS13K_ZIP):$(JS13K_HTML_MID) $(JS13K_DATA_MID);$(PRECMD) zip -j -9 $@ $^

# ----- cdrom edition -----

CDROM_SRCDIR:=src/cdrom
CDROM_MIDDIR:=mid/cdrom
CDROM_ZIP:=out/justbelow-cdrom.zip
CDROM_MIN_SRC:=$(filter $(CDROM_SRCDIR)/%.js $(CDROM_SRCDIR)/%.html,$(SRCFILES))
CDROM_HTML_MID:=$(CDROM_MIDDIR)/index.html
CDROM_DATA_SRC:=$(filter $(CDROM_SRCDIR)/%.png $(CDROM_SRCDIR)/%.mp3,$(SRCFILES))
CDROM_DATA_MID:=$(patsubst $(CDROM_SRCDIR)/%,$(CDROM_MIDDIR)/%,$(CDROM_DATA_SRC))
all:$(CDROM_ZIP)

# Nothing like JS13K's MIDI rules. CDROM's music is mp3, and it copies verbatim.

$(CDROM_HTML_MID):$(CDROM_MIN_SRC);$(PRECMD) $(EGG_SDK)/out/eggdev minify -o$@ $(CDROM_SRCDIR)/index.html

# Data in general will copy verbatim. But as a rule, we pass it thru the optimizer. Must use the same build process as JS13K, no cheating.
$(CDROM_MIDDIR)/%:$(CDROM_SRCDIR)/% $(TOOL_EXE);$(PRECMD) $(TOOL_EXE) -o$@ $<

$(CDROM_ZIP):$(CDROM_HTML_MID) $(CDROM_DATA_MID);$(PRECMD) zip -j -9 $@ $^

# ----- global commands -----

# Default rule builds 'all' and then shows the size of output artifacts.
all_and_show_size:all;ls -l out

# `make run` to serve js13k edition from the source. Great while developing, but beware it's not exactly the real thing.
run:$(JS13K_MIDI_DST);http-server -c-1 -p8080 src/js13k

# `make run-cd` for a similar treatment of the cdrom edition.
run-cd:;echo "TODO make run-cd"

# `make run-final` to build the real app and serve it out of the intermediate directory. (js13k edition)
run-final:$(JS13K_HTML_MID) $(JS13K_DATA_MID);http-server -c-1 -p8080 $(JS13K_MIDDIR)

# `make run-cd-final` mutatis mutandi.
run-cd-final:;echo "TODO make run-cd-final"

endif
