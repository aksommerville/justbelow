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

  /* TODO Size of world.
   * Maybe this should be configurable.
   */
  const w = 480;
  const h = 270;
  const islc = 10;
  const islspc = 40;
  const trc = 2;//20;
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
  
  /* TODO Can we guarantee:
   *  1. The outer edge is all water.
   *  2. No water exists inside an island.
   *  3. Islands are spaced by at least two meters of water.
   * Point 1 I believe already is guaranteed. (and if not, it's super easy to do)
   * Points 2 and 3 are important for placing the Boat.
   * They're usually true today but I'm pretty sure they're not guaranteed.
   * We could validate Point 2 with a buffer and two sweeps. Would leave any interior water unmarked, and we could turn those into land.
   * Point 3 is tricky. Might be better to ignore it and let it be the Boat's problem.
   */
  
  /* Add grass, rocks, and trees to each island's interior.
   */
  //TODO
  
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
      trv.push({ x, y });
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
   * Very important that this be on the same island as the hero!
   * Any water cell adjacent to a land cell with a path to the hero is a candidate.
   *  - Start at the hero's position.
   *  - Stab westward until we hit water -- found one candidate.
   *  - Trace the coastline clockwise from there until we reach the start or give up.
   *
   * XXX Actually, nuts to all this. Just pick a cardinal direction at random, and put the boat at the nearest water that way.
  let bx=herox, by=heroy;
  while ((bx > 0) && v[by*w+bx]) bx--;
  let bp = by * w + bx;
  let canv = [bp];
  for (let i=100; i-->0; ) { // Stop after 100 candidates, even if more are available. This naive algorithm can get trapped.
    /* Any water one step deasil of a land neighbor (cardinal or diagonal) is a candidate.
     * Collect them all and select randomly, even though there should almost always be just one candidate.
     * We might get stuck in a narrow bay, and we're not tracking which of the two coastlines is in play.
     * Counting on randomness to break us out of those, or ultimately, the iteration limit.
     * (fwiw narrow bays are pretty unlikely, due to dilation).
     * Do permit revisiting cells we've visited before, only way out of a narrow bay, but don't record them a second time.
     *
    const nv = [];
    ...
  }
  bp = canv[Math.floor(Math.random() * canv.length)];
  /*TODO Validate that a land path exists from the hero to any cardinal neighbor of (bp).
   * See above, if we can guarantee that islands be spaced by at least two meters, we don't need this.
   * But it might be easier to validate the path here, they're both tricky problems.
   * If (bp) is not valid, use (canv[0]) instead -- it is guaranteed valid.
   *
  bx = bp % w;
  by = Math.floor(bp / w);
  /**/
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
  
  return {w, h, v, herox, heroy, trv, bx, by};
}
