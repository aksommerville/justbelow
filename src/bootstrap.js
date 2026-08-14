import { Render } from "./Render.js";
import { generateMap } from "./generateMap.js";
import { K, Input } from "./Input.js";
import { Hero } from "./Hero.js";
import { Overlay } from "./Overlay.js";

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
    
    //TODO sprite controllers
    this.sprites.push(new Hero(
      this,
      this.map.herox+0.5,
      this.map.heroy+0.5
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
      
      this.render.render();
    }
    
    this.frame = requestAnimationFrame((_t) => this.update(_t));
  }
}

/* Bootstrap per browser.
 */
addEventListener("load", () => {
  const app = new App();
}, { once: true });
