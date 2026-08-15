/* Render.js
 */
 
import { Hero } from "./Hero.js";
 
export const TS = 16;
 
export class Render {
  constructor(app, cvs) {
    this.app = app;
    this.cvs = cvs;
    this.gfx = document.getElementById("gfx");
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
        //TODO quarter tiles
        //TODO tile animation
        const srcx = (this.app.map.v[p] & 15) * TS;
        const srcy = (this.app.map.v[p] >> 4) * TS;
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
      if (sprite.render) {
        sprite.render(ctx, x, y);
      } else {
        //XXX fallback for incomplete sprite
        const srcx=0, srcy=128;//TODO
        ctx.drawImage(this.gfx, srcx, srcy, TS, TS, x-(TS>>1), y-(TS>>1), TS, TS);
      }
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
  
  quit() {
    const ctx = this.cvs.getContext("2d");
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, this.cvs.width, this.cvs.height);
  }
  
  text(ctx, x, y, t) {
    if (!t) return 0;
    const x0 = x;
    for (let i=0; i<t.length; i++) {
      let ch = t.charCodeAt(i);
      if (ch >= 0x60) ch -= 0x20; // Turn uppercase to lowercase (and mangle some punctuation we don't care about).
      if (ch <= 0x20) {
        // All C0 counts as space. Narrower than a glyph.
        x += 2;
      } else if (ch > 0x5f) {
        // Illegal codepoint. Skip it and don't output anything.
      } else {
        const srcx = (ch & 15) * 3;
        const srcy = 95 + ((ch >> 4) - 2) * 5;
        ctx.drawImage(this.gfx, srcx, srcy, 3, 5, x, y, 3, 5);
        x += 4;
      }
    }
    return x - x0;
  }
  
  textc(ctx, y, t) {
    const gc = t.replaceAll(" ","").length;
    const len = gc * 4 + (t.length - gc) * 2;
    const x = (this.cvs.width >> 1) - (len >> 1);
    this.text(ctx, x, y, t);
  }
  
  renderWin() {
    const ctx = this.cvs.getContext("2d");
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, this.cvs.width, this.cvs.height);
    this.textc(ctx, 30, "You found all the bones!");
    ctx.drawImage(this.gfx, 0, 128, 16, 16, 100, 48, 16, 16);
    ctx.drawImage(this.gfx, 49, 97, 24, 20, 120, 43, 24, 20);
    this.textc(ctx, 70, `Time: ${this.tfmt(this.app.plt)}`);
    const pct = Math.max(0, Math.min(100, Math.round((this.app.scorec * 100) / (this.app.digc||1))));
    this.textc(ctx, 76, `Aim: ${pct}%`);
    this.textc(ctx, 90, "By AK Sommerville");
    this.textc(ctx, 96, "September 2026");
    this.textc(ctx, 110, "Thanks for playing!");
  }
  
  tfmt(s) {
    const ms = Math.floor(s * 1000) % 1000;
    let sec = ~~s;
    let min = Math.floor(sec / 60);
    sec %= 60;
    return `${min}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }
}
