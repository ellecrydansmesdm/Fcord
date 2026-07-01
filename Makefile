CC=gcc
# GStreamer est optionnel — détecté automatiquement
GST_OK     := $(shell pkg-config --exists gstreamer-1.0 gstreamer-app-1.0 gstreamer-video-1.0 2>/dev/null && echo yes || echo no)
ifeq ($(GST_OK),yes)
  GST_CFLAGS := $(shell pkg-config --cflags gstreamer-1.0 gstreamer-app-1.0 gstreamer-video-1.0) -DHAVE_GSTREAMER
  GST_LIBS   := $(shell pkg-config --libs   gstreamer-1.0 gstreamer-app-1.0 gstreamer-video-1.0)
  $(info GStreamer détecté — décodage vidéo activé)
else
  GST_CFLAGS :=
  GST_LIBS   :=
  $(info GStreamer non trouvé — décodage vidéo désactivé)
endif

FLAGS=`pkg-config --cflags gtk+-3.0 libsoup-2.4 rtaudio json-glib-1.0 opus libsodium libsecret-1` $(GST_CFLAGS)
LIBS=`pkg-config --libs gtk+-3.0 libsoup-2.4 rtaudio json-glib-1.0 opus libsodium libsecret-1` -lleveldb -lm $(GST_LIBS) -lwinmm -lmsacm32
PREFIX=/usr
BUILD_DIR=build
SRCS = $(shell find ./src/*.c | grep -v updater.c)
# Ressource Windows (icône)
RC_OBJ = $(BUILD_DIR)/fcord_rc.o
OBJS = $(patsubst %.c, $(BUILD_DIR)/%.o, $(SRCS))
OPTS=-O3
ifdef CACHE
OPTS+= -D USE_CACHE
endif

RTAUDIO_BELOW_6_0 := $(shell pkg-config --atleast-version=6.0.0 rtaudio && echo no || echo yes)
ifeq ($(RTAUDIO_BELOW_6_0), yes)
	OPTS+= -D RTAUDIO_BELOW_6_0
endif

all: $(BUILD_DIR)/fcord $(BUILD_DIR)/updater.exe

$(BUILD_DIR)/assets/: assets/
	mkdir -p $(dir $@)
	cp -r assets/* $(dir $@)
$(BUILD_DIR)/sounds/: assets/sounds/
	mkdir -p $(BUILD_DIR)/sounds
	cp assets/sounds/*.wav $(BUILD_DIR)/sounds/
$(BUILD_DIR)/themes/: themes/
	mkdir -p $(BUILD_DIR)/themes
	cp themes/*.css $(BUILD_DIR)/themes/
$(BUILD_DIR)/assets/gschemas.compiled: $(BUILD_DIR)/assets/
	glib-compile-schemas $(dir $@)
$(BUILD_DIR)/resources.c: resources.xml $(BUILD_DIR)/assets/gschemas.compiled
	glib-compile-resources --sourcedir=$(BUILD_DIR)/assets/ $< --target=$@ --generate-source
$(BUILD_DIR)/resources.o: $(BUILD_DIR)/resources.c
	$(CC) -c -o $@ $^ $(FLAGS) $(OPTS)

# Compiler les ressources Windows (.rc → .o)
$(BUILD_DIR)/fcord_rc.o: fcord.rc assets/fcord.ico
	mkdir -p $(BUILD_DIR)
	windres fcord.rc -o $@

$(BUILD_DIR)/%.o: %.c
	mkdir -p $(dir $@)
	$(CC) -c -o $@ $(FLAGS) $< -Wall -Wno-unused-function -Wno-misleading-indentation $(OPTS)

$(BUILD_DIR)/fcord: $(OBJS) $(BUILD_DIR)/resources.o $(RC_OBJ) $(BUILD_DIR)/themes/ $(BUILD_DIR)/sounds/
	$(CC) -o $@ $(OBJS) $(BUILD_DIR)/resources.o $(RC_OBJ) $(LIBS) -liphlpapi -lcrypt32 $(OPTS) -mwindows


# ── Updater ──────────────────────────────────────────────────────────────
$(BUILD_DIR)/updater.exe: src/updater.c
	$(CC) -o $@ $< `pkg-config --cflags --libs gtk+-3.0 libsoup-2.4 json-glib-1.0` -lm $(OPTS) -mwindows

clean:
	rm -rf build

uninstall:
	rm -f $(PREFIX)/share/applications/fcord.desktop
	rm -f $(PREFIX)/share/pixmaps/fcord.png
	rm -f $(PREFIX)/share/pixmaps/fcord.svg
	rm -f $(PREFIX)/bin/fcord

install: uninstall
	cp fcord.desktop $(PREFIX)/share/applications/fcord.desktop
	cp assets/icon.svg $(PREFIX)/share/pixmaps/fcord.svg
	cp $(BUILD_DIR)/fcord $(PREFIX)/bin/fcord

run: all
	cp assets/fcord.gschema.xml $(BUILD_DIR)/assets/fcord.gschema.xml
	glib-compile-schemas $(BUILD_DIR)/assets/
	./build/fcord
	
