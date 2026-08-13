import { Render } from "./Render.js";
import { generateMap } from "./generateMap.js";
import { K, Input } from "./Input.js";

/* App is the top level of our code. Anything above is straight boilerplate.
 */
class App {
  constructor() {
    this.cvs = document.getElementById("c");
    this.render = new Render(this, this.cvs);
    this.input = new Input(this);
    this.updt = 0;
    this.frame = requestAnimationFrame((t) => this.update(t));
    this.term = false;
    this.map = generateMap();
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
      
      if (this.input.state & K.QUIT) {
        this.render.quit();
        this.term = true;
        return;
      }
      
      //XXX TEMP move the camera around. we don't have sprites yet
      switch (this.input.state & (K.LEFT | K.RIGHT)) {
        case K.LEFT: this.render.herodx=-6; break;
        case K.RIGHT: this.render.herodx=6; break;
        default: this.render.herodx=0; break;
      }
      switch (this.input.state & (K.UP | K.DOWN)) {
        case K.UP: this.render.herody=-6; break;
        case K.DOWN: this.render.herody=6; break;
        default: this.render.herody=0; break;
      }
      this.render.herox+=this.render.herodx*el;
      this.render.heroy+=this.render.herody*el;
      if (
        ((this.render.herox<0)&&(this.render.herodx<0))||
        ((this.render.herox>this.map.w)&&(this.render.herodx>0))
      ) this.render.herodx*=-1;
      if (
        ((this.render.heroy<0)&&(this.render.herody<0))||
        ((this.render.heroy>this.map.w)&&(this.render.herody>0))
      ) this.render.herody*=-1;
      
      this.render.render();
    }
    
    this.frame = requestAnimationFrame((t) => this.update(t));
  }
}

/* Bootstrap per browser.
 */
addEventListener("load", () => {
  const app = new App();
}, { once: true });
