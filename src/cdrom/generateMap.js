/* generateMap.js
 * Produce a giant world map:
 * {
 *   w,h: int, in cells
 *   v: Uint8Array(w*h)
 *   herox, heroy,
 *   trv: {x,y}[],
 *   bx, by, // Boat
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

  /* Size of world and treasure count. Very flexible.
   */
  const w = 200;
  const h = 150;
  const islc = 10;
  const islspc = 30;
  const trc = 13;
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
  
  /* Dilation won't touch the edges, but it might be possible for the drunk-walk to.
   * (it depends on the config, and I keep tweaking those dials).
   * For safety's sake, force the world's edge to water.
   * Boat placement depends on this.
   */
  for (let i=0; i<w; i++) {
    v[i] = 0;
    v[v.length - i - 1] = 0;
  }
  for (let i=0, p=0; i<h; i++, p+=w) {
    v[p] = 0;
    v[p+w-1] = 0;
  }
  
  /* Eliminate any water enclaves inside any island.
   * Important to do this because otherwise the boat might spawn in a pond and be unusable.
   * (tho ponds are pretty rare to begin with).
   * We'll do two self-referencing sweeps of the map. One forward, one backward.
   * Record in (vb) which cells are connected by cardinal water neighbors to (0,0) (which is necessarily The Ocean).
   * ...actually, need to do those two sweeps repeatedly until they run clean.
   * Then any remaining water which is not marked in (vb) is a pond and must be drained.
   */
  vb.fill(0);
  vb[0] = 1; // Cell (0,0) is the ocean. Find the rest by connection to it.
  for (;;) { // Got to keep running until nothing fills. Deep narrow bays can cause trouble for this algorithm.
    let fl = 0;
    for (let y=0, p=0; y<h; y++) {
      for (let x=0; x<w; x++, p++) {
        if (v[p]) continue; // Not water, skip it.
        if (vb[p]) continue; // Been here.
        if (x && vb[p-1]) fl = vb[p] = 1;
        else if (y && vb[p-w]) fl = vb[p] = 1;
      }
    }
    for (let y=h, p=v.length-1; y-->0; ) {
      for (let x=w; x-->0; p--) {
        if (v[p]) continue; // Not water, skip it.
        if (vb[p]) continue; // Been here.
        if ((x<w-1) && vb[p+1]) fl = vb[p] = 1;
        else if ((y<h-1) && vb[p+w]) fl = vb[p] = 1;
      }
    }
    if (!fl) break;
  }
  for (let i=v.length; i-->0; ) {
    if (!v[i] && !vb[i]) {
      v[i] = 0x10;
    }
  }
  
  /* Bury treasure!
   * First, at terrible cost, put the index of every surface cell into an array.
   * Then pull one at random, if it's too close to a prior selection discard it, and otherwise put a treasure there.
   */
  const trv = [];
  const gv = [];
  for (let p=w*h; p-->0; ) {
    if (v[p]) gv.push(p);
  }
  for (let i=trc; i-->0; ) {
    for (;;) {
      if (gv.length < 1) break; // oops?
      const gp = Math.floor(Math.random() * gv.length);
      const vp = gv[gp];
      gv.splice(vp, 1);
      const x = vp % w + 0.5;
      const y = Math.floor(vp / w) + 0.5;
      let tooClose = false;
      for (const tr of trv) {
        const d2 = (tr.x - x) ** 2 + (tr.y - y) ** 2;
        if (d2 < 10) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;
      trv.push({ x, y, id: 4 }); // id always 4 -- unicorn bones are the only treasure
      break;
    }
  }
  
  /* Put hero at the first island's focus point.
   * Everything's randomish, so this could be any island in the layout, and pretty much anywhere on that island.
   * Will never be right on the coast tho.
   */
  const herox = islands[0].x;
  const heroy = islands[0].y;
  
  /* Pick a starting point for the boat.
   * I'm cheesing this hard: It's the first water cell in a random cardinal direction from the hero.
   * We depend on islands being off the edge, and having no interior water.
   */
  let bx=herox, by=heroy, dx=0, dy=0;
  switch ((Math.random()*4)&3) {
    case 0: dx=-1; break;
    case 1: dx=1; break;
    case 2: dy=-1; break;
    case 3: dy=1; break;
  }
  while (v[by*w+bx]) {
    bx += dx;
    by += dy;
  }
  
  /* XXX Very temporary. Draw a picture of the map and show it to me.
   *
  if (1) {
    const cvs = document.createElement("CANVAS");
    cvs.width = w;
    cvs.height = h;
    const ctx = cvs.getContext("2d");
    const imd = ctx.createImageData(w, h);
    for (let srcp=0, dstp=0; srcp<w*h; srcp++) {
      if (v[srcp]) { // Sand.
        imd.data[dstp++] = 0xff;
        imd.data[dstp++] = 0xff;
        imd.data[dstp++] = 0x00;
        imd.data[dstp++] = 0xff;
      } else { // Water.
        imd.data[dstp++] = 0x00;
        imd.data[dstp++] = 0x00;
        imd.data[dstp++] = 0xff;
        imd.data[dstp++] = 0xff;
      }
    }
    // Also highlight the treasures in black:
    for (const tr of trv) {
      const x = Math.floor(tr.x);
      const y = Math.floor(tr.y);
      let p = (y*w+x)*4;
      imd.data[p++] = 0x00;
      imd.data[p++] = 0x00;
      imd.data[p++] = 0x00;
      imd.data[p++] = 0xff;
    }
    // Show me, and dismiss on click:
    ctx.putImageData(imd, 0, 0);
    cvs.addEventListener("mousedown", () => cvs.remove());
    cvs.style.position = "absolute";
    cvs.style.left = "0";
    cvs.style.top = "0";
    cvs.style.width = "100vw";
    cvs.style.height = "100vh";
    cvs.style.objectFit = "contain";
    document.body.append(cvs);
  }
  /**/
  
  return {w, h, v, herox, heroy, trv, bx, by};
}
