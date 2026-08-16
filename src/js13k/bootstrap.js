import { Render } from "./Render.js";
import { generateMap } from "./generateMap.js";
import { K, Input } from "./Input.js";
import { Hero } from "./Hero.js";
import { Overlay } from "./Overlay.js";
import { Boat } from "./Boat.js";
import { Audio } from "./Audio.js";

/* App is the top level of our code. Anything above is straight boilerplate.
 */
class App {
  constructor() {
    this.cvs = document.getElementById("c");
    this.render = new Render(this, this.cvs);
    this.input = new Input(this);
    this.overlay = new Overlay(this);
    this.audio = new Audio(this);
    this.updt = 0;
    this.frame = requestAnimationFrame((t) => this.update(t));
    this.term = false;
    this.map = generateMap();
    this.sprites = [];
    this.win = false;
    this.trmc = 0; // Termination clock. Counts down if nonzero.
    this.plt = 0; // Play time.
    this.digc = 0;
    this.scorec = 0;
    
    this.sprites.push(new Hero(
      this,
      this.map.herox+0.5,
      this.map.heroy+0.5
    ));
    this.sprites.push(new Boat(
      this,
      this.map.bx+0.5,
      this.map.by+0.5
    ));
  }
  
  update(t) {
    this.frame = null;
    if (this.term) {
      this.audio.quit();
      return;
    }
    
    /* Force interval in 10..20 ms.
     * If too short, eg high-frequency monitor, skip frames.
     * If too long, clamp to 20 and run slow.
     */
    let el = t - this.updt;
    if (el >= 10) {
      if (el > 20) el = 20;
      this.updt = t;
      el /= 1000;
      this.plt += el;
      this.audio.update(el);
      this.input.update(el);
      this.render.update(el);
      this.overlay.update(el);
      
      if (this.input.state & K.QUIT) {
        this.render.quit();
        this.audio.quit();
        this.term = true;
        return;
      }
      
      for (const sprite of this.sprites) sprite.update?.(el);
      
      if (this.trmc > 0) {
        if ((this.trmc -= el) <= 0) {
          this.term = true;
          this.win = true;
          this.render.renderWin();
          this.audio.quit();
          return;
        }
      }
      
      this.render.render();
    }
    
    this.frame = requestAnimationFrame((_t) => this.update(_t));
  }
  
  checkCompletion() {
  
    /* Incomplete if any treasure remains ungot.
     */
    if (this.map.trv.find(t => !t.got)) return 0;
    
    this.trmc = 2.000;
    
    return 1;
  }
  
  rmspr(s) {
    const p = this.sprites.indexOf(s);
    if (p < 0) return;
    this.sprites.splice(p, 1);
  }
}

/* Bootstrap per browser.
 */
addEventListener("load", () => {
  const app = new App();
}, { once: true });
