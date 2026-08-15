#ifndef TOOL_INTERNAL_H
#define TOOL_INTERNAL_H

#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <stdint.h>
#include <limits.h>
#include "opt/fs/fs.h"
#include "opt/serial/serial.h"
#include "opt/image/image.h"
#include "opt/midi/midi.h"

extern struct g {

  // From argv:
  const char *exename;
  const char *srcpath;
  const char *dstpath;
  
  void *src;
  int srcc;
  struct sr_encoder dst;
  
} g;

/* All "convert_" functions read from (g.src) and write to (g.dst).
 * (g.dst) is empty initially.
 */
int convert_png();
int convert_mid();

#endif
