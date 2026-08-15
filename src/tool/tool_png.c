#include "tool_internal.h"

/* Optimize PNG file, main entry point.
 */
 
int convert_png() {
  //TODO Decode image, strip anything unnecessary, and reencode. I bet we can do better than GIMP.
  // Do not change dimensions or move pixels around! The code must be able to run against an image either before or after this conversion.
  // But after all that, check the sizes and if we came out bigger, keep the original.
  return sr_encode_raw(&g.dst,g.src,g.srcc);
}
