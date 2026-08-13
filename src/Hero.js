/* Hero.js
 * Controller for the hero sprite.
 */
 
import { K } from "./Input.js";
import { TS } from "./Render.js";
 
export class Hero {
  constructor(app, x, y) {
    this.app = app;
    this.x = x;
    this.y = y;
    
    this.pvinput = this.app.input.state;
    this.hlx = 0;
    this.hly = 0;
    this.hlr = 0;
    this.hlt = 0;
    this.hlp = 0;
  }
  
  update(el) {
    if (this.app.input.state !== this.pvinput) {
      if ((this.app.input.state & K.USE) && !(this.pvinput & K.USE)) this.onUse();
      else if (!(this.app.input.state & K.USE) && (this.pvinput & K.USE)) this.onUnuse();
      this.pvinput = this.app.input.state;
    }
    
    const speed = 6.000;
    switch (this.app.input.state & (K.LEFT | K.RIGHT)) {
      case K.LEFT: this.x -= speed * el; break;
      case K.RIGHT: this.x += speed * el; break;
    }
    switch (this.app.input.state & (K.UP | K.DOWN)) {
      case K.UP: this.y -= speed * el; break;
      case K.DOWN: this.y += speed * el; break;
    }
    
    if (this.hlr > 0) {
      this.hlp += el * 1.000;
      if (this.hlp >= 1) {
        this.hlr = 0;
      }
    }
  }
  
  onUse() {
    //TODO This is the magic wand. There will be other items. At a minimum, a shovel.
    /* Find the nearest treasure.
     */
    let nearest = null;
    let neard2 = 100; // Maximum range of detection, squared.
    for (const tr of this.app.map.trv) {
      const d2 = (tr.x - this.x) ** 2 + (tr.y - this.y) ** 2;
      if (d2 < neard2) {
        neard2 = d2;
        nearest = tr;
      }
    }
    if (!nearest) {
      return;
    }
    this.hlx = nearest.x;
    this.hly = nearest.y;
    this.hlr = Math.sqrt(neard2);
    this.hlt = Math.atan2(this.y - nearest.y, this.x - nearest.x);
    this.hlp = 0;
  }
  
  onUnuse() {
  }
  
  render(ctx, x, y) {
    const offx = x - this.x*TS;
    const offy = y - this.y*TS;
    const srcx=0, srcy=128;//TODO
    ctx.drawImage(this.app.render.gfx, srcx, srcy, TS, TS, x-(TS>>1), y-(TS>>1), TS, TS);
    
    // Rainbow if in use.
    if (this.hlr > 0) {
      const ta = this.hlt - this.hlp * 1.000;
      const tz = this.hlt + this.hlp * 1.000;
      ctx.globalAlpha = Math.min(1, (1 - this.hlp) * 2);
      ctx.lineWidth = 2;
      const rstep = 2;
      const clrv = ["#f0f", "#00f", "#0ff", "#0f0", "#ff0", "#f80", "#f00"];
      for (let r=this.hlr*TS-rstep*3, i=0; i<7; i++, r+=rstep) {
        if (r <= 0) continue;
        ctx.beginPath();
        ctx.arc(this.hlx*TS + offx, this.hly*TS + offy, r, ta, tz);
        ctx.strokeStyle = clrv[i];
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1;
    }
  }
}
