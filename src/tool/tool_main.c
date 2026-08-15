#include "tool_internal.h"

struct g g={0};

int main(int argc,char **argv) {

  /* Read command line.
   */
  g.exename="tool";
  if ((argc>=1)&&argv&&argv[0]&&argv[0][0]) g.exename=argv[0];
  int i=1; while (i<argc) {
    const char *arg=argv[i++];
    if (!arg||!arg[0]) continue;
    if (!memcmp(arg,"-o",2)) {
      if (g.dstpath) {
        fprintf(stderr,"%s: Multiple output paths.\n",g.exename);
        return 1;
      }
      g.dstpath=arg+2;
    } else if (arg[0]=='-') {
      fprintf(stderr,"%s: Unexpected argument '%s'\n",g.exename,arg);
      return 1;
    } else if (g.srcpath) {
      fprintf(stderr,"%s: Multiple input paths.\n",g.exename);
      return 1;
    } else {
      g.srcpath=arg;
    }
  }
  if (!g.dstpath||!g.srcpath) {
    fprintf(stderr,"Usage: %s -oDST SRC\n",g.exename);
    return 1;
  }
  
  /* Acquire input file.
   */
  if ((g.srcc=file_read(&g.src,g.srcpath))<0) {
    fprintf(stderr,"%s: Failed to read file\n",g.srcpath);
    return 1;
  }
  
  /* Normalize suffix of input path.
   */
  const char *sfxsrc=0;
  int sfxc=0;
  int srcp=0;
  for (;g.srcpath[srcp];srcp++) {
    if (g.srcpath[srcp]=='/') {
      sfxsrc=0;
      sfxc=0;
    } else if (g.srcpath[srcp]=='.') {
      sfxsrc=g.srcpath+srcp+1;
      sfxc=0;
    } else if (sfxsrc) {
      sfxc++;
    }
  }
  char sfx[16];
  if (sfxc>sizeof(sfx)) sfxc=sizeof(sfx);
  for (i=sfxc;i-->0;) {
    if ((sfxsrc[i]>='A')&&(sfxsrc[i]<='Z')) sfx[i]=sfxsrc[i]+0x20;
    else sfx[i]=sfxsrc[i];
  }
  
  /* Suffix tells us what we're doing.
   * Unknown is fine; those copy verbatim.
   */
  int err;
  if ((sfxc==3)&&!memcmp(sfx,"png",3)) err=convert_png();
  else if ((sfxc==3)&&!memcmp(sfx,"mid",3)) err=convert_mid();
  else err=sr_encode_raw(&g.dst,g.src,g.srcc);
  if (err<0) {
    if (err!=-2) fprintf(stderr,"%s: Unspecified error converting file.\n",g.srcpath);
    return 1;
  }
  
  /* Write output.
   */
  if (file_write(g.dstpath,g.dst.v,g.dst.c)<0) {
    fprintf(stderr,"%s: Failed to write output, %d bytes.\n",g.dstpath,g.dst.c);
    return 1;
  }
  
  /* Show me the size difference.
   */
  fprintf(stderr,"%s: %d => %d\n",g.srcpath,g.srcc,g.dst.c);

  return 0;
}
