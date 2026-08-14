/* Boat.js
 * We always exist and always render.
 * When the hero is riding, she controls our position and we still do the rendering.
 */
 
import { TS } from "./Render.js";
 
export class Boat {
  constructor(app, x, y) {
    this.app = app;
    this.x = x;
    this.y = y;
    
    // Hero may set directly:
    this.hero = null;
    
    this.cl = 0;
    this.af = 0;
  }
  
  update(el) {
    if ((this.cl -= el) <= 0) {
      this.cl += 0.400;
      this.af ^= 1;
    }
  }
  
  render(ctx, x, y) {
    let ti = 0x84;
    if (this.af) ti += 1;
    if (this.hero) ti += 2;
    const srcx = (ti & 15) * TS;
    const srcy = (ti >> 4) * TS;
    ctx.drawImage(this.app.render.gfx, srcx, srcy, TS, TS, x-(TS>>1), y-(TS>>1), TS, TS);
  }
}
