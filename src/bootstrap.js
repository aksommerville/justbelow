import { Render } from "./Render.js";
import { generateMap } from "./generateMap.js";
import { K, Input } from "./Input.js";
import { Hero } from "./Hero.js";
import { Overlay } from "./Overlay.js";
import { Boat } from "./Boat.js";

/* App is the top level of our code. Anything above is straight boilerplate.
 */
class App {
  constructor() {
    this.cvs = document.getElementById("c");
    this.render = new Render(this, this.cvs);
    this.input = new Input(this);
    this.overlay = new Overlay(this);
    this.updt = 0;
    this.frame = requestAnimationFrame((t) => this.update(t));
    this.term = false;
    this.map = generateMap();
    this.sprites = [];
    this.win = false;
    
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
      console.log(`App terminated`);//XXX
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
      this.input.update(el);
      this.overlay.update(el);
      
      if (this.input.state & K.QUIT) {
        this.render.quit();
        this.term = true;
        return;
      }
      
      for (const sprite of this.sprites) sprite.update?.(el);
      
      if (this.term && this.win) return; // Don't overwrite the "game over" bit we just drew!
      this.render.render();
    }
    
    this.frame = requestAnimationFrame((_t) => this.update(_t));
  }
  
  checkCompletion() {
  
    /* Incomplete if any treasure remains ungot.
     * TODO Eventually it should be only if a *unicorn bone* remains ungot, not necessarily any treasure.
     */
    if (this.map.trv.find(t => !t.got)) return 0;
    
    console.log(`App.checkCompletion`);
    this.term = true; // XXX Probably don't want to kill the whole app here. Let music play during gameover, maybe animation, and let them start over.
    this.win = true;
    this.render.renderWin();
    
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
