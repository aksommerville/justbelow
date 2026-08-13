/* generateMap.js
 * Produce a giant world map:
 * {
 *   w,h: int, in cells
 *   v: Uint8Array(w*h)
 * }
 * Cell values are tileid in gfx.png.
 */
 
function dilate(dst, src, w, h) {
  for (let y=1, p=w; y<h-1; y++) {
    p++;
    for (let x=1; x<w-1; x++, p++) {
    
      // Nonzero values pass along verbatim.
      if (src[p]) {
        dst[p] = src[p];
      
      // If zero, check for cardinal neighbors.
      // We're not scanning the edges, and they should have been zero to start with.
      } else {
        const n = src[p-1] || src[p+1] || src[p-w] || src[p+w]; // || src[p-w-1] || src[p-w+1] || src[p+w-1] || src[p+w+1];
        if (n) dst[p] = n;
        else dst[p] = src[p];
      }
    }
    p++;
  }
}

export function generateMap() {

  /* TODO Size of world.
   * Maybe this should be configurable.
   */
  //XXX Starting with world map the size of the framebuffer, so I can preview it one pixel per tile. No reason to use these bounds in real life.
  const w = 480;
  const h = 270;
  const islc = 10;
  const islspc = 40;
  const v = new Uint8Array(w * h);
  
  /* Seed the initial islands.
   * Positions are entirely random, but check the previous islands and maintain a tasteful distance.
   * Also maintain that same distance from the world edges. Better for the world's edge to be exlusively maritime.
   * It's up to us to set (w,h,islc) such that this is always possible -- too many islands and it loops forever.
   */
  const dlim = islspc ** 2;
  const islands = [];
  for (let i=islc; i-->0; ) {
    let x, y;
    for (;;) {
      x = islspc + Math.floor(Math.random() * (w - islspc*2));
      y = islspc + Math.floor(Math.random() * (h - islspc*2));
      let ok = 1;
      for (const s of islands) {
        const d = (x - s.x) ** 2 + (y - s.y) ** 2;
        if (d < dlim) {
          ok = 0;
          break;
        }
      }
      if (ok) break;
    }
    islands.push({
      x, y,
    });
    v[y * w + x] = 16;
  }
  console.log(`island seeds in ${w}x${h} world: ${JSON.stringify(islands)}`);
  
  /* Drunk-walk by cardinal steps from each seed to make a more interesting shape.
   * It's ok to stop early.
   * It's also ok to hit another island, tho that should be rare.
   * Leaves us with a nice little petri dish of proto-islands.
   */
  for (const island of islands) {
    let px=island.x, py=island.y;
    let p = py * w + px;
    for (let i=50; i-->0; ) {
      const canv = [];
      if ((px > 0) && !v[p-1]) canv.push([px-1, py]);
      if ((px < w-1) && !v[p+1]) canv.push([px+1, py]);
      if ((py > 0) && !v[p-w]) canv.push([px, py-1]);
      if ((py < h-1) && !v[p+w]) canv.push([px, py+1]);
      if (!canv.length) break; // We painted ourselves into a corner. No worries, just stop.
      const [x, y] = canv[Math.floor(Math.random() * canv.length)];
      v[y * w + x] = 16;
      px = x;
      py = y;
      p = py * w + px;
    }
  }
  
  /* Dilate islands to give them some bulk.
   * Don't combine islands.
   * We need a second buffer for this.
   * Each pass of the loop is two dilations, so the output ends up in the original buffer.
   * Dilation is generic across the whole map. Nothing per-island.
   * One or two loops produces pleasing edges. Any more and they start to look too diamond-shaped.
   */
  const vb = new Uint8Array(v.length);
  for (let i=2; i-->0; ) {
    dilate(vb, v, w, h);
    dilate(v, vb, w, h);
  }
  
  /* Add grass, rocks, and trees to each island's interior.
   */
  //TODO
  
  /* Bury treasure!
   */
  //TODO
  
  return {w, h, v};
}
