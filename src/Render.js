/* Render.js
 */
 
const TS = 16;
 
export class Render {
  constructor(app, cvs) {
    this.app = app;
    this.cvs = cvs;
    this.gfx = document.getElementById("gfx");
    
    /*XXX
    this.herox=0;//XXX
    this.heroy=0;
    this.herodx=0;
    this.herody=0;
    /**/
  }
  
  render() {
    const ctx = this.cvs.getContext("2d");
    
    const hero = this.app.sprites[0];//TODO better hero identification. And what's our default if she vanishes?
    
    /* Determine camera position, in world pixels.
     */
    let cx = 0;
    let cy = 0;
    cx = (hero.x*TS - (this.cvs.width * 0.5));
    cy = (hero.y*TS - (this.cvs.height * 0.5));
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
        let srcx=0, srcy=0;
        if (this.app.map.v[p]) srcy = TS;
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
      const srcx=0, srcy=128;//TODO
      ctx.drawImage(this.gfx, srcx, srcy, TS, TS, x-(TS>>1), y-(TS>>1), TS, TS);
    }
  }
  
  quit() {
    const ctx = this.cvs.getContext("2d");
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, this.cvs.width, this.cvs.height);
  }
}
