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
    this.pvitemid = 0; // Set at button down, may linger.
    
    // Highlight (the rainbow).
    this.hlx = 0;
    this.hly = 0;
    this.hlr = 0;
    this.hlt = 0;
    this.hlp = 0;
    
    // Face direction. Always a cardinal unit vector.
    this.fdx = 0;
    this.fdy = 1;
    
    // Previous input direction.
    this.indx = 0;
    this.indy = 0;
    
    // Quantized active position. Only updates while shovel equipped.
    this.iqx = 0;
    this.iqy = 0;
  }
  
  /* Update.
   **************************************************************************************/
  
  update(el) {
  
    /* Check press and release of the USE and CHOOSE buttons.
     * And if the overlay is enabled, send dpad clicks to it.
     */
    if (this.app.input.state !== this.pvinput) {
      if ((this.app.input.state & K.USE) && !(this.pvinput & K.USE)) this.onUse();
      else if (!(this.app.input.state & K.USE) && (this.pvinput & K.USE)) this.onUnuse();
      if ((this.app.input.state & K.CHOOSE) && !(this.pvinput & K.CHOOSE)) this.app.overlay.enable();
      else if (!(this.app.input.state & K.CHOOSE) && (this.pvinput & K.CHOOSE)) this.app.overlay.disable();
      if (this.app.overlay.enabled) {
        if ((this.app.input.state & K.LEFT) && !(this.pvinput & K.LEFT)) this.app.overlay.move(-1);
        if ((this.app.input.state & K.RIGHT) && !(this.pvinput & K.RIGHT)) this.app.overlay.move(1);
      }
      this.pvinput = this.app.input.state;
    }
    
    /* Poll dpad, and walk if nonzero.
     */
    let dx=0, dy=0;
    if (!this.app.overlay.enabled) {
      switch (this.app.input.state & (K.LEFT | K.RIGHT)) {
        case K.LEFT: dx = -1; break;
        case K.RIGHT: dx = 1; break;
      }
      switch (this.app.input.state & (K.UP | K.DOWN)) {
        case K.UP: dy = -1; break;
        case K.DOWN: dy = 1; break;
      }
    }
    if (dx || dy) {
      const speed = 6.000; // m/s
      this.x += speed * dx * el;
      this.y += speed * dy * el;
      if (dx && !this.indx) {
        this.fdx = dx;
        this.fdy = 0;
      } else if (dy && !this.indy) {
        this.fdx = 0;
        this.fdy = dy;
      } else if (dx && !dy && this.fdy) {
        this.fdx = dx;
        this.fdy = 0;
      } else if (dy && !dx && this.fdx) {
        this.fdx = 0;
        this.fdy = dy;
      } else if (this.fdx && (this.fdx !== dx)) {
        this.fdx = dx;
      } else if (this.fdy && (this.fdy !== dy)) {
        this.fdy = dy;
      }
      //TODO collisions
    }
    this.indx = dx;
    this.indy = dy;
    
    /* Advance rainbow if rainbowing.
     */
    if (this.hlr > 0) {
      this.hlp += el * 1.000;
      if (this.hlp >= 1) {
        this.hlr = 0;
      }
    }
    
    /* Item maintenance.
     */
    switch (this.app.overlay.getItem()?.id) {
      case 2: this.updateShovel(el); break;
    }
  }
  
  /* Item dispatch.
   ***************************************************************************/
  
  onUse() {
    const item = this.app.overlay.getItem();
    if (!item) return;
    this.pvitemid = item.id;
    switch (item.id) {
      case 1: this.useWand(); break;
      case 2: this.useShovel(); break;
    }
  }
  
  onUnuse() {
    switch (this.pvitemid) {
      // Most items shouldn't need an Off event.
    }
  }
  
  /* Wand.
   **********************************************************************/
  
  useWand() {
    const tr = this.nearestTreasure();
    if (!tr) return; // Nothing in range, let any existing rainbow play out.
    this.hlx = tr.x;
    this.hly = tr.y;
    this.hlr = Math.sqrt((tr.x - this.x) ** 2 + (tr.y - this.y) ** 2);
    this.hlt = Math.atan2(this.y - tr.y, this.x - tr.x);
    this.hlp = 0;
  }
  
  /* Shovel.
   ***********************************************************************/
  
  useShovel() {
    if ((this.iqx < 0) || (this.iqx >= this.app.map.w)) return;
    if ((this.iqy < 0) || (this.iqy >= this.app.map.h)) return;
    // Only plain sand is diggable, reject all else. (esp including dug holes).
    if (this.app.map.v[this.iqy * this.app.map.w + this.iqx] !== 0x10) {
      console.log(`can't dig here (${this.iqx},${this.iqy})`);//TODO friendly rejection
      return;
    }
    // Whether there's treasure or not, replace cell with the dug tile.
    this.app.map.v[this.iqy * this.app.map.w + this.iqx] = 0x11;
    // Is there treasure here?
    const x1=this.iqx+1, y1=this.iqy+1;
    let tr = null;
    for (const q of this.app.map.trv) {
      if (q.got) continue;
      if (q.x < this.iqx) continue;
      if (q.y < this.iqy) continue;
      if (q.x > x1) continue;
      if (q.y > y1) continue;
      tr = q;
      break;
    }
    // Then get the treasure or reject.
    if (tr) {
      tr.got = 1;
      console.log(`GOT TREASURE: ${JSON.stringify(tr)}`);//TODO
    } else {
      console.log(`no treasure here (${this.iqx},${this.iqy})`);//TODO rejection sound and graphics
    }
  }
  
  updateShovel(el) {
    // Quantized position leads a little in the facing direction.
    this.iqx = Math.floor(this.x + this.fdx * 0.500);
    this.iqy = Math.floor(this.y + (this.fdy ? (this.fdy * 0.500) : 0.250));
  }
  
  /* Item support.
   ******************************************************************************/
   
  nearestTreasure() {
    let nearest = null;
    let neard2 = 100; // Maximum range of detection, squared.
    for (const tr of this.app.map.trv) {
      if (tr.got) continue;
      const d2 = (tr.x - this.x) ** 2 + (tr.y - this.y) ** 2;
      if (d2 < neard2) {
        neard2 = d2;
        nearest = tr;
      }
    }
    return nearest;
  }
  
  /* Render.
   ************************************************************************************/
  
  render(ctx, x, y) {
    const offx = x - this.x*TS;
    const offy = y - this.y*TS;
    
    /* Get the equipped item.
     * Some passively require a quantization indicator. Maybe just shovel.
     */
    const item = this.app.overlay.getItem();
    switch (item?.id) {
      case 2: { // Shovel: Quantization indicator.
          const x0 = Math.round(this.iqx * TS + offx) + 0.5;
          const y0 = Math.round(this.iqy * TS + offy) + 0.5;
          ctx.beginPath();
          ctx.moveTo(x0   ,y0   );
          ctx.lineTo(x0   ,y0+TS);
          ctx.lineTo(x0+TS,y0+TS);
          ctx.lineTo(x0+TS,y0   );
          ctx.lineTo(x0   ,y0   );
          ctx.strokeStyle = "#0f0";
          ctx.stroke();
        } break;
    }
    
    /* Draw my principal frame.
     */
    let ti = 0x80;
    if (this.fdx < 0) ti += 2;
    else if (this.fdx > 0) ti += 3;
    else if (this.fdy < 0) ti += 1;
    const srcx = (ti & 15) * TS;
    const srcy = (ti >> 4) * TS;
    ctx.drawImage(this.app.render.gfx, srcx, srcy, TS, TS, x-(TS>>1), y-(TS>>1), TS, TS);
    
    // Anything else for items? We're not displaying them in hand, to keep things simple.
    
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
