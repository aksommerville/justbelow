/* Overlay.js
 * Manages the little bar at the top of the screen.
 * We own the set of available items, and which one is equipped.
 */
 
export class Overlay {
  constructor(app) {
    this.app = app;
    
    this.enabled = false; // "enabled" means "engaged", like we're consuming input right now.
    this.enslide = 0;
    
    this.items = [
      { id: 1 }, // Wand.
      { id: 2 }, // Shovel.
      //TODO These items should be found as treasure. For now, you start with everything:
      { id: 3 }, // Compass.
    ];
    this.itemp = 0;
  }
  
  getItem() {
    return this.items[this.itemp];
  }
  
  enable() {
    this.enabled = true;
  }
  
  disable() {
    this.enabled = false;
  }
  
  move(d) {
    this.itemp += d;
    if (this.itemp < 0) this.itemp = this.items.length - 1;
    else if (this.itemp >= this.items.length) this.itemp = 0;
  }
  
  update(el) {
    if (this.enabled) {
      if ((this.enslide += el * 3.000) > 1) this.enslide = 1;
    } else {
      if ((this.enslide -= el * 3.000) < 0) this.enslide = 0;
    }
  }
  
  render(ctx) {
  
    // Take some measurements according to (enslide).
    const barh = Math.round(10 + this.enslide * 10);
    const blota = this.enslide * 0.500;
    const bara = 0.5 + this.enslide * 0.3;
    
    // Top blotter and sometimes a remainder blotter.
    ctx.fillStyle = "#000";
    ctx.globalAlpha = bara;
    ctx.fillRect(0, 0, this.app.render.cvs.width, barh);
    if (blota) {
      ctx.globalAlpha = blota;
      ctx.fillRect(0, barh, this.app.render.cvs.width, this.app.render.cvs.height - barh);
    }
    ctx.globalAlpha = 1;
    
    // Item icons.
    let dsty = (barh >> 1) - 5;
    let dstx = this.app.render.cvs.width - 15;
    for (let i=this.items.length; i-->0; dstx-=11) {
      const item = this.items[i];
      if (i === this.itemp) { // Selected.
        ctx.fillStyle = "#004";
        ctx.fillRect(dstx-1, 0, 12, barh);
        if (this.enslide >= 1) {
          ctx.drawImage(this.app.render.gfx, 0, 115, 5, 3, dstx+3, dsty+11, 5, 3);
        }
      }
      ctx.drawImage(this.app.render.gfx, (item.id-1)*10, 118, 10, 10, dstx, dsty, 10, 10);
    }
    
    // Progress indicator on the left side.
    const trc = this.app.map.trv.reduce((a, v) => a + (v.got ? 1 : 0), 0);
    const tra = this.app.map.trv.length;
    this.app.render.text(ctx, 3, 2, `${trc}/${tra}`);
  }
}
