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
    this.song = "";
    this.songElement = null;
    this.songNode = null;
    if (!AudioContext) return; // I don't think this ever happens but hey.
    this.ctx = new AudioContext({ latencyHint: "interactive" });
    if (this.ctx.state === "suspended") this.ctx.resume();
  }
  
  poke() {
    if (this.ctx?.state === "suspended") this.ctx.resume();
  }
  
  pause() {
    this.ctx?.suspend();
  }
  resume() {
    this.ctx?.resume();
  }
  
  update(el) {
    /* We're not streaming the BinarySong in this edition, and our MediaElement takes care of itself.
     */
  }
  
  playSong(name, repeat) {
    if (name === this.song) return;
    if (this.songElement) {
      this.songElement.remove();
      this.songElement = null;
    }
    if (this.songNode) {
      this.songNode.disconnect();
      this.songNode = null;
    }
    this.song = name;
    this.songElement = document.createElement("audio");
    if (repeat) this.songElement.loop = true;
    this.songElement.autoplay = true;
    this.songElement.src = `./${name}.mp3`;
    document.body.appendChild(this.songElement);
    this.songNode = new MediaElementAudioSourceNode(this.ctx, {
      mediaElement: this.songElement,
    });
    this.songNode.connect(this.ctx.destination);
  }
  
  /* (post) is null or (osc,env,t)=>env, return the node to connect to output
   * Time zero is legal for "asap".
   * This was part of the song playback in js13k edition; we're using it only for sound effects.
   */
  note(t, c, n, d, post) {
    if (!this.ctx) return;
    if (!t) t = this.ctx.currentTime;
  
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
    
    /* Level adjust for song notes and not sound effects.
     */
    if (post === "song") {
      post = null;
      hi *= 0.500;
      lo *= 0.500;
    }
  
    /* Oscillator+Envelope, the simplest reasonable synthesizer.
     */
    const osc = new OscillatorNode(this.ctx, {
      type,
      frequency: 440 * 2 ** ((n - 30) / 12), // Offset by 39 per our wacky format, then by -69 (A4=440).
    });
    let env = new GainNode(this.ctx);
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
    if (post) env = post(osc, env, t);
    env.connect(this.ctx.destination);
    osc.addEventListener("ended", () => { osc.disconnect(); env.disconnect(); }, { once: true });
  }
  
  /* Sound effects.
   **************************************************************************/
  
  sfBoat() {
    if (!this.ctx) return;
    this.note(this.ctx.currentTime+0.000, 2, 0x10, 0.100);
    this.note(this.ctx.currentTime+0.100, 2, 0x14, 0.100);
  }
  
  sfUnboat() {
    if (!this.ctx) return;
    this.note(this.ctx.currentTime+0.000, 2, 0x14, 0.100);
    this.note(this.ctx.currentTime+0.100, 2, 0x10, 0.100);
  }
  
  sfWandRej() {
    this.note(0, 3, 0x08, 0.200, (osc, env, t) => {
      osc.detune.setValueAtTime(t, 0);
      osc.detune.linearRampToValueAtTime(-600, t+0.300);
      return env;
    });
  }
  
  sfWand() {
    this.note(0, 1, 0x20, 0.800, (osc, env, t) => {
      osc.detune.setValueAtTime(t, 0);
      osc.detune.linearRampToValueAtTime(1200, t+0.800);
      return env;
    });
  }
  
  sfShovelRej() {
    this.note(0, 3, 0x08, 0.200, (osc, env, t) => {
      osc.detune.setValueAtTime(t, 0);
      osc.detune.linearRampToValueAtTime(-600, t+0.300);
      return env;
    });
  }
  
  sfShovel() {
    if (!this.ctx) return;
    this.note(this.ctx.currentTime+0.000, 1, 0x20, 0.100);
    this.note(this.ctx.currentTime+0.200, 1, 0x20, 0.100);
    this.note(this.ctx.currentTime+0.300, 1, 0x25, 0.150);
  }
  
  sfOverlay() {
    this.note(0, 2, 0x20, 0.300, (osc, env, t) => {
      osc.detune.setValueAtTime(t, 0);
      osc.detune.linearRampToValueAtTime(700, t+0.400);
      return env;
    });
  }
  
  sfUnoverlay() {
    this.note(0, 2, 0x27, 0.300, (osc, env, t) => {
      osc.detune.setValueAtTime(t, 0);
      osc.detune.linearRampToValueAtTime(-700, t+0.400);
      return env;
    });
  }
  
  sfMotion() {
    this.note(0, 2, 0x30, 0.100, (osc, env, t) => {
      osc.detune.setValueAtTime(t, 0);
      osc.detune.linearRampToValueAtTime(400, t+0.100);
      return env;
    });
  }
}
