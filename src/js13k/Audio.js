/* Audio.js
 * Manages the whole audio stack.
 */
 
export class Audio {
  constructor(app) {
    this.app = app;
    this.init();
  }
  
  quit() {
    if (!this.ctx) return;
    if (this.ctx.state === "running") this.ctx.suspend();
  }
  
  init() {
    this.evtv = [];
    this.evtp = 0;
    this.sst = 0;
    this.dur = 0;
    if (!AudioContext) return; // I don't think this ever happens but hey.
    this.ctx = new AudioContext({ latencyHint: "interactive" });
    if (this.ctx.state === "suspended") this.ctx.resume();
    
    if (0) {//XXX Disable music until I like the sound effects.
    fetch("./unicorn.bs").then(rsp => {
      if (!rsp.ok) throw rsp;
      return rsp.arrayBuffer();
    }).then(rsp => {
      this.decode(rsp);
    }).catch(e => console.error(e));
    }
  }
  
  poke() {
    if (this.ctx?.state === "suspended") this.ctx.resume();
  }
  
  update(el) {
    if (this.ctx?.state !== "running") return;
    if (this.evtv.length < 1) return;
    const stop = this.ctx.currentTime + 4; // Process any pending events up to this context time.
    for (;;) {
      if (this.evtp >= this.evtv.length) {
        this.evtp = 0;
        this.sst += this.dur;
      }
      const e = this.evtv[this.evtp];
      const t = e.t + this.sst;
      if (t > stop) break; // OK, we have enough of the future queued.
      this.evtp++;
      this.note(t, e.c, e.n, e.d);
    }
  }
  
  decode(ab) {
    const src = new Uint8Array(ab);
    this.evtv = []; // {t,c,n,d} = Time s, Channel 0..3, Note 0..63, Duration s. In chronological order.
    let tms = 0; // Readhead time in ms (not s!)
    for (let srcp=0; srcp<src.length; ) {
      let cmd = src[srcp++];
      if (!(cmd & 0x80)) { // Fine delay.
        tms += cmd + 1;
      } else if (!(cmd & 0x40)) { // Coarse delay.
        tms += ((cmd & 0x3f) + 1) << 7;
      } else { // Note.
        const n = cmd & 0x3f;
        cmd = src[srcp++];
        const c = cmd >> 6;
        const d = (cmd & 0x3f) / 62.5; // 16ms per unit
        this.evtv.push({t:tms/1000,c,n,d});
      }
    }
    if (tms < 1000) { // Improbably short song. Panic, don't play anything.
      this.evtv = [];
      this.dur = 0;
      this.evtp = 0;
      return;
    }
    this.dur = tms / 1000;
    //console.log(`decoded song, dur=${this.dur}`, this.evtv); // So far so good.
    this.sst = this.ctx.currentTime; // Song Start Time.
    this.evtp = 0;
  }
  
  note(t, c, n, d) {
  
    /* Instrument definitions.
     */
    let type, atk, dec, rls, hi, lo;
    switch (c) {
      case 0: { // Bass.
          type = "sine";
          atk = 0.040;
          dec = 0.030;
          rls = 0.400;
          hi = 0.200;
          lo = 0.100;
        } break;
      case 1: { // Lead.
          type = "square";//sine,square,triangle,sawtooth
          atk = 0.020;
          dec = 0.050;
          rls = 0.300;
          hi = 0.140;
          lo = 0.080;
        } break;
      case 2: { // High accents.
          type = "triangle";
          atk = 0.012;
          dec = 0.020;
          rls = 0.200;
          hi = 0.200;
          lo = 0.050;
        } break;
      default: { // Organ.
          type = "square";
          atk = 0.040;
          dec = 0.030;
          rls = 0.300;
          hi = 0.060;
          lo = 0.050;
        } break;
    }
  
    /* Oscillator+Envelope, the simplest reasonable synthesizer.
     */
    const osc = new OscillatorNode(this.ctx, {
      type,
      frequency: 440 * 2 ** ((n - 30) / 12), // Offset by 39 per our wacky format, then by -69 (A4=440).
    });
    const env = new GainNode(this.ctx);
    const esus = Math.max(t+d, t+atk+dec);
    env.gain.setValueAtTime(0, 0);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(hi, t+atk);
    env.gain.linearRampToValueAtTime(lo, t+atk+dec);
    env.gain.setValueAtTime(lo, esus);
    env.gain.linearRampToValueAtTime(0, esus+rls);
    osc.start();
    osc.stop(esus+rls);
    osc.connect(env);
    env.connect(this.ctx.destination);
    osc.addEventListener("ended", () => { osc.disconnect(); env.disconnect(); }, { once: true });
  }
}
