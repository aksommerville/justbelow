#include "tool_internal.h"

/* We store noteid in 6 bits instead of 7, and offset all by so much.
 * It is the lowest note in the one song we're tasked with encoding.
 */
#define NOTEID0 0x27

/* Reencoder context.
 */
 
struct midctx {
  struct midi_file *file;
  struct sr_encoder *dst; // WEAK
  int now; // ms, during read. Once read, it's the full duration in ms.
  int notelo,notehi; // Just for reference.
  struct note {
    int when;
    int chid;
    int noteid; // MIDI noteid, not the value we encode.
    int velocity;
    int dur; // <0 if unpopulated (we'll warn and clamp those to zero right after finishing the scan).
  } *notev;
  int notec,notea;
  const char *errmsg; // Canned error if we can. May be null, never empty.
};

static void midctx_cleanup(struct midctx *ctx) {
  midi_file_del(ctx->file);
  if (ctx->notev) free(ctx->notev);
}

static struct note *midctx_add_note(struct midctx *ctx,int chid,int noteid,int velocity) {
  if (ctx->notec>=ctx->notea) {
    int na=ctx->notea+128;
    if (na>INT_MAX/sizeof(struct note)) return 0;
    void *nv=realloc(ctx->notev,sizeof(struct note)*na);
    if (!nv) return 0;
    ctx->notev=nv;
    ctx->notea=na;
  }
  struct note *note=ctx->notev+ctx->notec++;
  memset(note,0,sizeof(struct note));
  note->when=ctx->now;
  note->chid=chid;
  note->noteid=noteid;
  note->velocity=velocity;
  note->dur=-1;
  return note;
}

/* Play the MIDI file and capture Note On and Note Off events.
 * Populates (notev).
 * We may leave (dur<0) for notes with no Off event.
 */
 
static int capture_midi_events(struct midctx *ctx) {
  for (;;) {
    struct midi_event event={0};
    int err=midi_file_next(&event,ctx->file);
    if (err<0) {
      if (midi_file_is_finished(ctx->file)) break;
      ctx->errmsg="Error reading MIDI stream.";
      return -1;
    }
    if (err>0) {
      ctx->now+=err;
      if (midi_file_advance(ctx->file,err)<0) {
        ctx->errmsg="Error advancing MIDI clock.";
        return -1;
      }
      continue;
    }
    switch (event.opcode) {
    
      case 0x90: { // Note On. Track noteid range, and add a record to (notev).
          if (event.opcode==0x90) {
            if (event.a<ctx->notelo) ctx->notelo=event.a;
            if (event.a>ctx->notehi) ctx->notehi=event.a;
          }
          if (!midctx_add_note(ctx,event.chid,event.a,event.b)) return -1;
        } break;
        
      case 0x80: { // Note Off. Find the corresponding Note On and populate its (dur).
          // Search from the start, even though it's likely to be near the end.
          // Rationale: If there's ever "ON ON OFF OFF", that first OFF should match the first ON, not the second.
          struct note *note=ctx->notev;
          int i=ctx->notec,ok=0;
          for (;i-->0;note++) {
            if (note->dur>=0) continue;
            if (note->chid!=event.chid) continue;
            if (note->noteid!=event.a) continue;
            note->dur=ctx->now-note->when;
            ok=1;
            break;
          }
          if (!ok) {
            fprintf(stderr,"%s:WARNING: Unmatched Note Off. t=%dms ch=%d n=0x%02x\n",g.srcpath,ctx->now,event.chid,event.a);
          }
        } break;
        
      // No other event matters.
    }
  }
  return 0;
}

/* Having acquired the full song, scan and validate (notev).
 */
 
static int validate(struct midctx *ctx) {

  /* No notes is not technically an error, we could still encode it.
   * But highly fishy. Enough so to abort the process.
   */
  if (!ctx->notec) {
    ctx->errmsg="Song has no notes.";
    return -1;
  }
  
  /* Missing Note Off is a warning but carry on.
   * Similarly, long duration is a warning. We can encode up to 1008 ms.
   * Note ID out of range is a hard error.
   * Chid must be in 0..3, we only have 4 output channels.
   */
  struct note *note=ctx->notev;
  int i=ctx->notec;
  for (;i-->0;note++) {
    if (note->dur<0) {
      note->dur=0;
      fprintf(stderr,
        "%s:WARNING: Unmatched Note On. t=%dms ch=%d n=0x%02x. Outputting with duration zero.\n",
        g.srcpath,note->when,note->chid,note->noteid
      );
    } else if (note->dur>1008) {
      fprintf(stderr,
        "%s:WARNING: Long duration truncated to 1008 from %d ms. t=%dms ch=%d n=0x%02x.\n",
        g.srcpath,note->dur,note->when,note->chid,note->noteid
      );
      note->dur=1008;
    }
    if ((note->noteid<NOTEID0)||(note->noteid>=NOTEID0+0x40)) {
      fprintf(stderr,
        "%s:ERROR: Invalid noteid 0x%02x (t=%dms, ch=%d). Must be in 0x%02x..0x%02x.\n",
        g.srcpath,note->noteid,note->when,note->chid,NOTEID0,NOTEID0+0x3f
      );
      return -2;
    }
    if ((note->chid<0)||(note->chid>3)) {
      fprintf(stderr,
        "%s:ERROR: Invalid channel %d. Only 0..3 are supported.\n",
        g.srcpath,note->chid
      );
      return -2;
    }
  }
  
  return 0;
}

/* Write output to (dst) from (notev).
 */
 
static int encode_bs(struct midctx *ctx) {
  int wh=0,shortdelay=INT_MAX,shorttime=0,shortchid=0;
  const struct note *note=ctx->notev;
  int i=ctx->notec;
  for (;i-->0;note++) {
  
    /* Emit delays as necessary, and bring the writehead up to note's start time.
     */
    int delay=note->when-wh;
    if (delay<0) {
      fprintf(stderr,"%s:ERROR: Time travel around %dms, expected at least %dms.\n",g.srcpath,note->when,wh);
      return -2;
    }
    if ((delay>0)&&(delay<shortdelay)) { // Record the shortest nonzero delay so we can complain about it later.
      shortdelay=delay;
      shorttime=wh;
      shortchid=note->chid;
    }
    while (delay>8192) { // hell of a delay!
      if (sr_encode_u8(ctx->dst,0xbf)<0) return -1;
      delay-=8192;
    }
    if (delay>128) { // Need a Coarse Delay.
      if (sr_encode_u8(ctx->dst,0x80|((delay>>7)-1))<0) return -1;
      delay&=0x7f;
    }
    if (delay) { // Need a Fine Delay.
      if (sr_encode_u8(ctx->dst,delay-1)<0) return -1;
    }
    wh=note->when;
    
    /* Emit the note.
     * Force the three values to something legal. Warning about oobs is validate()'s problem, not ours.
     */
    int noteid=(note->noteid-NOTEID0)&0x3f;
    int chid=note->chid&0x03;
    int dur=note->dur>>4;
    if (dur<0) dur=0; else if (dur>0x3f) dur=0x3f;
    if (sr_encode_u8(ctx->dst,0xc0|noteid)<0) return -1;
    if (sr_encode_u8(ctx->dst,(chid<<6)|dur)<0) return -1;
  }
  
  /* One more batch of delays to bring us to the song end.
   */
  int delay=ctx->now-wh;
  if (delay<0) {
    fprintf(stderr,"%s:ERROR: Time travel around %dms (final), expected at least %dms.\n",g.srcpath,note->when,wh);
    return -2;
  }
  if ((delay>0)&&(delay<shortdelay)) { // Record the shortest nonzero delay so we can complain about it later.
    shortdelay=delay;
  }
  while (delay>8192) { // hell of a delay!
    if (sr_encode_u8(ctx->dst,0xbf)<0) return -1;
    delay-=8192;
  }
  if (delay>128) { // Need a Coarse Delay.
    if (sr_encode_u8(ctx->dst,0x80|((delay>>7)-1))<0) return -1;
    delay&=0x7f;
  }
  if (delay) { // Need a Fine Delay.
    if (sr_encode_u8(ctx->dst,delay-1)<0) return -1;
  }
  
  /* If the shortest delay is very short, issue a warning.
   * We could quantize time if we wanted to, but I feel that's out of scope.
   * But a warning is reasonable: Our caller is surely interested in optimizing the encode as far as possible.
   * ...I got the ones and twos. Now I'm starting to worry that quantizing the longer ones will be audible, and I'm not sure whether high or low is correct.
   * So stop quantizing until we get to hear it.
   */
  fprintf(stderr,"%s: Finished encode of %d notes (%d ms total). Shortest delay = %d ms (around %dms on channel %d)\n",g.srcpath,ctx->notec,ctx->now,shortdelay,shorttime,shortchid);
  
  return 0;
}

/* Main operation, with context.
 * Context must be zeroes initially, and the caller must clean it up regardless of result.
 */

static int convert_mid_inner(struct midctx *ctx,const void *src,int srcc,struct sr_encoder *dst) {
  int err;
  ctx->dst=dst;
  ctx->notehi=0x00;
  ctx->notelo=0xff;

  if (!(ctx->file=midi_file_new(src,srcc,1000))) {
    ctx->errmsg="Failed to decode MIDI file.";
    return -1;
  }
  
  if ((err=capture_midi_events(ctx))<0) {
    if (!ctx->errmsg) ctx->errmsg="Error capturing MIDI events.";
    return err;
  }
  
  if ((err=validate(ctx))<0) {
    if (!ctx->errmsg) ctx->errmsg="Unspecified error during intermediate validation.";
    return err;
  }
  
  if ((err=encode_bs(ctx))<0) {
    if (!ctx->errmsg) ctx->errmsg="Error reencoding to BS.\n";
    return err;
  }
  
  return 0;
}

/* Convert MIDI to BinarySong, our private song format.
 */
 
int convert_mid() {
  struct midctx ctx={0};
  int err=convert_mid_inner(&ctx,g.src,g.srcc,&g.dst);
  if (err<0) {
    if (err!=-2) {
      fprintf(stderr,"%s: %s\n",g.srcpath,ctx.errmsg?ctx.errmsg:"Unspecified error initializing song reencoder.\n");
      err=-2;
    }
  }
  midctx_cleanup(&ctx);
  return err;
}
