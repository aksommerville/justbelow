/* Hero.js
 * Controller for the hero sprite.
 */
 
import { K } from "./Input.js";
import { TS } from "./Render.js";
import { Boat } from "./Boat.js";
 
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
    
    // Null when on foot, otherwise the Boat sprite that we're riding.
    this.boat = null;
    
    // Brief motion blackout. Counts down after boarding or deboarding the boat.
    this.mbl = 0;
    
    // Null or radians. Null if no treasure.
    this.cmps = null;
    
    // Dig toast.
    this.tid = 0;
    this.tttl = 0;
  }
  
  /* Physics.
   ***************************************************************************/
  
  // If a collision exists, escape it along (corx,cory) and return true.
  // (0,0) to only test collisions.
  rectify(corx, cory) {
    const r = 0.480; // Hoping to dodge the need for off-axis correction by making us a little smaller than a meter.
    const slop = 0.001; // Wee overcorrection, necessary to prevent toe stubs.
    const ww=this.app.map.w, wh=this.app.map.h;
    let cola = Math.floor(this.x-r); if (cola < 0) cola = 0;
    let colz = Math.floor(this.x+r); if (colz >= ww) colz = ww-1;
    let rowa = Math.floor(this.y-r); if (rowa < 0) rowa = 0;
    let rowz = Math.floor(this.y+r); if (rowz >= wh) rowz = wh-1;
    for (let col=cola; col<=colz; col++) {
      for (let row=rowa; row<=rowz; row++) {
        const tl = this.app.map.v[row*ww+col];
        const hard = this.boat ? tl : (tl < 0x10);
        if (hard) {
          // The first collision wins. Hopefully she's not moving by more than one meter at a time!
               if (corx < 0) this.x = col - r - slop;
          else if (corx > 0) this.x = col + 1 + r + slop;
          else if (cory < 0) this.y = row - r - slop;
          else if (cory > 0) this.y = row + 1 + r + slop;
          return 1;
        }
      }
    }
    // TODO Should we check world edges when in the boat? Anything OOB is effectively water, which the boat can travel on.
    return 0;
  }
  
  /* Bumped something solid.
   * Check for boat enter/exit.
   ****************************************************************************/
   
  bump() {
    // Focus on a point one meter in our face direction. Note that we don't care which way she moved, only which way she's looking.
    const x = this.x + this.fdx;
    const y = this.y + this.fdy;
    
    /* In the boat:
     * If we're focussed on a land cell, exit the boat and put us in the center of that cell.
     * There will be some minor-axis jump usually. I think that's better than landing in a wall and having to sort that out.
     */
    if (this.boat) {
      const qx = Math.floor(x);
      const qy = Math.floor(y);
      if ((qx >= 0) && (qy >= 0) && (qx < this.app.map.w) && (qy < this.app.map.h)) {
        const tl = this.app.map.v[qy * this.app.map.w + qx];
        if (tl >= 0x10) {
          this.boat.x = this.x;
          this.boat.y = this.y;
          this.x = qx + 0.5;
          this.y = qy + 0.5;
          this.boat.hero = null;
          this.boat = null;
          this.mbl = 0.3;
          this.app.audio.sfUnboat();
          return;
        }
      }
      
    /* On foot:
     * If that focus point is within the boat, say with a square half-meter radius, board it.
     * The boat's position is preserved.
     */
    } else {
      for (const boat of this.app.sprites) {
        if (boat instanceof Boat) {
          const br = 0.6; // A little extra-wide. Shouldn't be necessary but early on, I had some quirky unreachable boats in corner situations.
          const dx = x - boat.x;
          if ((dx < -br) || (dx > br)) continue;
          const dy = y - boat.y;
          if ((dy < -br) || (dy > br)) continue;
          this.x = boat.x;
          this.y = boat.y;
          this.boat = boat;
          boat.hero = this;
          this.mbl = 0.3;
          this.app.audio.sfBoat();
          return;
        }
      }
    }
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
    if (this.mbl > 0) {
      this.mbl -= el;
    } else if (!this.app.overlay.enabled) {
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
      const speed = this.boat ? 10.0 : 6.0; // m/s
      if (dx) {
        this.x += speed * dx * el;
        if (this.rectify(-dx, 0)) this.bump();
      }
      if (dy) {
        this.y += speed * dy * el;
        if (this.rectify(0, -dy)) this.bump();
      }
      if (this.boat) {
        this.boat.x = this.x;
        this.boat.y = this.y;
      }
    }
    this.indx = dx;
    this.indy = dy;
    
    /* Advance timed things.
     */
    if (this.hlr > 0) {
      this.hlp += el * 1.000;
      if (this.hlp >= 1) {
        this.hlr = 0;
      }
    }
    if (this.tttl > 0) this.tttl -= el;
    
    /* Item maintenance.
     */
    switch (this.app.overlay.getItem()?.id) {
      case 2: this.updateShovel(el); break;
    }
    
    /* Passive item maintenance.
     */
    this.updateCompass(el);
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
    const tr = this.nearestTreasure(10);
    if (!tr) { // Nothing in range, let any existing rainbow play out.
      this.toast(0);
      this.app.audio.sfWandRej();
      return;
    }
    this.app.audio.sfWand();
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
    // Also, no digging in a boat, that doesn't even make sense.
    if (this.boat || (this.app.map.v[this.iqy * this.app.map.w + this.iqx] !== 0x10)) {
      console.log(`can't dig here (${this.iqx},${this.iqy})`);//TODO friendly rejection
      this.toast(0);
      this.app.audio.sfShovelRej();
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
      this.app.audio.sfShovel();
      tr.got = 1;
      console.log(`GOT TREASURE: ${JSON.stringify(tr)}`);//TODO
      this.toast(tr.id);
      this.app.checkCompletion();
    } else {
      this.app.audio.sfShovelRej();
      console.log(`no treasure here (${this.iqx},${this.iqy})`);//TODO rejection sound and graphics
      this.toast(0);
    }
  }
  
  updateShovel(el) {
    // Quantized position leads a little in the facing direction.
    this.iqx = Math.floor(this.x + this.fdx * 0.500);
    this.iqy = Math.floor(this.y + (this.fdy ? (this.fdy * 0.500) : 0.250));
  }
  
  toast(id) {
    this.tid = id;
    this.tttl = 1.000;
  }
  
  /* Compass.
   * Entirely passive. Just points toward the nearest treasure at all times, when sailing.
   ***************************************************************************/
   
  updateCompass(el) {
    this.cmps = null;
    if (!this.boat) return;
    if (!this.app.overlay.hasItem(3)) return;
    const tr = this.nearestTreasure(500);
    if (!tr) return;
    this.cmps = Math.atan2(tr.y - this.y, tr.x - this.x);
  }
  
  /* Item support.
   ******************************************************************************/
   
  nearestTreasure(range) {
    let nearest = null;
    let neard2 = range ** 2; // Maximum range of detection, squared.
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
      case 2: if (!this.boat) { // Shovel: Quantization indicator. Hide if in boat, it's not relevant then.
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
    
    /* Compass.
     */
    if (this.cmps !== null) { // Compass: Highlight one direction.
      // Tile 0x88. Trim 1 pixel top and left, and 2 pixels right and bottom.
      const sx=129, sy=129, w=13, r=16;
      const cx = x + r * Math.cos(this.cmps);
      const cy = y + r * Math.sin(this.cmps);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(this.cmps);
      ctx.drawImage(this.app.render.gfx, sx, sy, w, w, w*-0.4, w*-0.4, w*0.8, w*0.8);
      ctx.restore();
    }
    
    /* Draw my principal frame.
     * If we're riding the boat, it does the rendering.
     */
    if (!this.boat) {
      let ti = 0x80;
      if (this.fdx < 0) ti += 2;
      else if (this.fdx > 0) ti += 3;
      else if (this.fdy < 0) ti += 1;
      const srcx = (ti & 15) * TS;
      const srcy = (ti >> 4) * TS;
      ctx.drawImage(this.app.render.gfx, srcx, srcy, TS, TS, x-(TS>>1), y-(TS>>1), TS, TS);
    }
    
    // Anything else for items? We're not displaying them in hand, to keep things simple.
    
    // Toast above my head briefly after digging.
    if (this.tttl > 0) {
      let ti = this.tid ? 0x8a : 0x89;
      const srcx = (ti & 15) * TS;
      const srcy = (ti >> 4) * TS;
      if (this.tttl < 0.5) ctx.globalAlpha = this.tttl*2;
      ctx.drawImage(this.app.render.gfx, srcx, srcy, TS, TS, x-(TS>>1), y-TS-(TS>>1), TS, TS);
      if (this.tid) {
        ctx.drawImage(this.app.render.gfx, (this.tid-1)*10, 118, 10, 10, x-5, y-TS-5, 10, 10);
        if ((this.tttl * 10) & 1) {
          ctx.drawImage(this.app.render.gfx, 176, srcy, TS, TS, x-(TS>>1), y-TS-(TS>>1), TS, TS);
        }
      }
      ctx.globalAlpha = 1;
    }
    
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
