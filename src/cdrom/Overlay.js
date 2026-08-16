/* Overlay.js
 * Manages the little bar at the top of the screen.
 * We own the set of available items, and which one is equipped.
 */
 
export class Overlay {
  constructor(app) {
    this.app = app;
    this.reset();
  }
  
  reset() {
    this.enabled = false; // "enabled" means "engaged", like we're consuming input right now.
    this.enslide = 0;
    
    /* Equippable items.
     */
    this.items = [
      { id: 1 }, // Wand.
      { id: 2 }, // Shovel.
    ];
    this.itemp = 0;
    
    /* Passive items.
     */
    this.pasv = [
      { id: 3 }, // Compass.
    ];
  }
  
  getItem() {
    return this.items[this.itemp];
  }
  
  hasItem(id) {
    return this.pasv.find(i => i.id === id) || this.items.find(i => i.id === id);
  }
  
  enable() {
    if (this.enabled) return;
    this.app.audio.sfOverlay();
    this.enabled = true;
  }
  
  disable() {
    if (!this.enabled) return;
    this.app.audio.sfUnoverlay();
    this.enabled = false;
  }
  
  move(d) {
    this.app.audio.sfMotion();
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
    const barh = Math.round(60 + this.enslide * 60);
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
    
    // Item icons for equippables.
    let dsty = (barh >> 1) - 30;
    let dstx = this.app.render.cvs.width - 90;
    for (let i=this.items.length; i-->0; dstx-=66) {
      const item = this.items[i];
      if (i === this.itemp) { // Selected.
        ctx.fillStyle = "#004";
        ctx.fillRect(dstx-3, 0, 66, barh);
        if (this.enslide >= 1) {
          ctx.drawImage(this.app.render.gfx, 0, 402, 30, 18, dstx+18, dsty+66, 30, 18);
        }
      }
      ctx.drawImage(this.app.render.gfx, (item.id-1)*60, 420, 60, 60, dstx, dsty, 60, 60);
    }
    
    // Progress indicator on the left side.
    const trc = this.app.map.trv.reduce((a, v) => a + (v.got ? 1 : 0), 0);
    const tra = this.app.map.trv.length;
    dstx = 30 + this.app.render.text(ctx, 18, dsty+16, `${trc}/${tra}`);
    
    // Then passive items right of the count.
    for (const item of this.pasv) {
      ctx.drawImage(this.app.render.gfx, (item.id-1)*60, 420, 60, 60, dstx, dsty, 60, 60);
      dstx += 66;
    }
  }
}
