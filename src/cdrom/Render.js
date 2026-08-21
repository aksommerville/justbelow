/* Render.js
 */
 
import { Hero } from "./Hero.js";
 
export const TS = 96;
 
export class Render {
  constructor(app, cvs) {
    this.app = app;
    this.cvs = cvs;
    this.gfx = document.getElementById("gfx");
    this.bgf = 0; // Background animation frame.
    this.bgc = 0; // Background animation clock.
  }
  
  update(el) {
    if ((this.bgc -= el) <= 0) {
      this.bgc += 0.200;
      if (++this.bgf >= 4) this.bgf = 0;
    }
  }
  
  render() {
    const ctx = this.cvs.getContext("2d");
    
    const hero = this.app.sprites.find(s => s instanceof Hero);
    
    /* Determine camera position, in world pixels.
     * Round initially, then again at the end. Without the first one, there can be some hero jitter with odd dimensions.
     */
    let cx = 0;
    let cy = 0;
    cx = Math.round(hero.x*TS) - (this.cvs.width * 0.5);
    cy = Math.round(hero.y*TS) - (this.cvs.height * 0.5);
    const xlim = this.app.map.w * TS - this.cvs.width;
    const ylim = this.app.map.h * TS - this.cvs.height;
    if (cx < 0) cx = 0; else if (cx > xlim) cx = xlim;
    if (cy < 0) cy = 0; else if (cy > ylim) cy = ylim;
    cx = Math.round(cx);
    cy = Math.round(cy);
    
    /* Draw the map first. It covers the entire framebuffer.
     */
    let cola = Math.floor(cx / TS);
    let rowa = Math.floor(cy / TS);
    let colz = Math.floor((cx + this.cvs.width - 1) / TS);
    let rowz = Math.floor((cy + this.cvs.height - 1) / TS);
    if (cola < 0) cola = 0;
    if (colz > this.app.map.w) colz = this.app.map.w;
    if (rowa < 0) rowa = 0;
    if (rowz > this.app.map.h) rowz = this.app.map.h;
    for (let row=rowa, dsty=rowa*TS-cy; row<=rowz; row++, dsty+=TS) {
      for (let col=cola, dstx=cola*TS-cx, p=row*this.app.map.w+cola; col<=colz; col++, dstx+=TS, p++) {
        let ti = this.app.map.v[p];
        if (ti) { // 0x10=sand, 0x11=sand+hole. And that's actually everything, except water.
          this.quarterTile(ctx, dstx, dsty, 192, 96, 48, 48, p);
          if (ti === 0x10) continue;
        }
        if (!ti) { // Water animates.
          ti += this.bgf;
        }
        const srcx = (ti & 15) * TS;
        const srcy = (ti >> 4) * TS;
        ctx.drawImage(this.gfx, srcx, srcy, TS, TS, dstx, dsty, TS, TS);
      }
    }
    
    /* Then sprites, if in range.
     */
    const xlo=-TS, xhi=this.cvs.width+TS, ylo=-TS, yhi=this.cvs.height+TS;
    for (const sprite of this.app.sprites) {
      const x = Math.round(sprite.x * TS - cx);
      if ((x < xlo) || (x > xhi)) continue;
      const y = Math.round(sprite.y * TS - cy);
      if ((y < ylo) || (y > yhi)) continue;
      sprite.render?.(ctx, x, y);
    }
    
    /* Overlay.
     */
    this.app.overlay.render(ctx);
    
    /* If we're counting down to termination, fade out.
     */
    if ((this.app.trmc > 0) && (this.app.trmc < 1)) {
      ctx.globalAlpha = 1-this.app.trmc;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, this.cvs.width, this.cvs.height);
      ctx.globalAlpha = 1;
    }
  }
  
  quarterTile(ctx, dstx, dsty, srcx, srcy, colw, rowh, cellp) {
    const v = this.app.map.v;
    const w = this.app.map.w;
    const neighbors = (dx, dy) => { // 1=horz, 2=vert, 3=diag. Diagonal is only reported if both horz and vert present. So there's 5 possible values.
      let n = (v[cellp+dx]?1:0)|(v[cellp+dy*w]?2:0);
      if (n === 3) n |= (v[cellp+dx+dy*w]?4:0);
      return n;
    };
    const sub = (dc, dr, sc, sr) => {
      ctx.drawImage(this.gfx, srcx + sc * colw, srcy + sr * rowh, colw, rowh, dstx + dc * colw, dsty + dr * rowh, colw, rowh);
    };
    switch (neighbors(-1,-1)) { // NW
      case 0: sub(0, 0, 2, 0); break;
      case 1: sub(0, 0, 4, 0); break;
      case 2: sub(0, 0, 4, 1); break;
      case 3: sub(0, 0, 6, 0); break;
      case 7: sub(0, 0, 0, 0); break;
    }
    switch (neighbors(1,-1)) { // NE
      case 0: sub(1, 0, 3, 0); break;
      case 1: sub(1, 0, 4, 0); break;
      case 2: sub(1, 0, 5, 1); break;
      case 3: sub(1, 0, 7, 0); break;
      case 7: sub(1, 0, 1, 0); break;
    }
    switch (neighbors(-1, 1)) { // SW
      case 0: sub(0, 1, 2, 1); break;
      case 1: sub(0, 1, 5, 0); break;
      case 2: sub(0, 1, 4, 1); break;
      case 3: sub(0, 1, 6, 1); break;
      case 7: sub(0, 1, 0, 1); break;
    }
    switch (neighbors(1, 1)) { // SE
      case 0: sub(1, 1, 3, 1); break;
      case 1: sub(1, 1, 5, 0); break;
      case 2: sub(1, 1, 5, 1); break;
      case 3: sub(1, 1, 7, 1); break;
      case 7: sub(1, 1, 1, 1); break;
    }
  }
  
  quit() {
    const ctx = this.cvs.getContext("2d");
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, this.cvs.width, this.cvs.height);
  }
  
  text(ctx, x, y, t) {
    ctx.font = "30px sans-serif";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(t, x, y);
    return ctx.measureText(t).width;
  }
  
  textc(ctx, y, t) {
    ctx.font = "30px sans-serif";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(t, this.cvs.width >> 1, y);
  }
  
  renderWin() {
    const ctx = this.cvs.getContext("2d");
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, this.cvs.width, this.cvs.height);
    this.textc(ctx, 180, "You found all the bones!");
    ctx.drawImage(this.gfx, 0, 480, 96, 96, 830, 288, 96, 96);
    ctx.drawImage(this.gfx, 294, 294, 252, 120, 960, 252, 252, 120);
    this.textc(ctx, 420, `Time: ${this.tfmt(this.app.plt)}`);
    const pct = Math.max(0, Math.min(100, Math.round((this.app.scorec * 100) / (this.app.digc||1))));
    this.textc(ctx, 456, `Aim: ${pct}%`);
    this.textc(ctx, 540, "By AK Sommerville");
    this.textc(ctx, 576, "September 2026");
    this.textc(ctx, 660, "Thanks for playing!");
  }
  
  tfmt(s) {
    const ms = Math.floor(s * 1000) % 1000;
    let sec = ~~s;
    let min = Math.floor(sec / 60);
    sec %= 60;
    return `${min}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }
  
  hello() {
    const ctx = this.cvs.getContext("2d");
    const img = document.getElementById("hello");
    ctx.drawImage(img, 0, 0);
  }
}
