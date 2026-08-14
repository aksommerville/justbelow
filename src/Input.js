/* Input.js
 */
 
/* Logical input buttons.
 */
export const K = {
  LEFT: 1,
  RIGHT: 2,
  UP: 4,
  DOWN: 8,
  USE: 16,
  CHOOSE: 32,
  PAUSE: 64,
  QUIT: 128,
};

/* Static input mapping.
 * TODO Input config is for sure out of scope for js13k, but can we make it configurable in the CD-ROM Edition?
 */
const bByK = {

  ArrowLeft: K.LEFT,
  ArrowRight: K.RIGHT,
  ArrowUp: K.UP,
  ArrowDown: K.DOWN,
  
  KeyW: K.UP,
  KeyA: K.LEFT,
  KeyS: K.DOWN,
  KeyD: K.RIGHT,
  
  Numpad8: K.UP,
  Numpad4: K.LEFT,
  Numpad5: K.DOWN,
  Numpad6: K.RIGHT,
  Numpad2: K.DOWN,
  Numpad0: K.USE,
  NumpadEnter: K.CHOOSE,
  
  KeyZ: K.USE,
  KeyX: K.CHOOSE,
  Space: K.USE,
  Escape: K.QUIT,
  Enter: K.PAUSE,
};
 
export class Input {
  constructor(app) {
    this.app = app;
    
    this.state = 0; // bitfields, K.*. For public consumption.
    
    /* {
     *   id
     *   state
     *   a: float[] // Axis states, parallel to Gamepad.axes
     *   b: int[] // Button states, parallel to Gamepad.buttons
     * }
     * Sparse, and index matches the browser's.
     */
    this.gpv = [];
    
    addEventListener("keydown", e => this.onKeyDown(e));
    addEventListener("keyup", e => this.onKeyUp(e));
    
    addEventListener("gamepadconnected", e => this.onConn(e));
    addEventListener("gamepaddisconnected", e => this.onDis(e));
  }
  
  update(el) {
    this.updgp();
  }
  
  /* Keyboard.
   ************************************************************************/
   
  onKeyDown(e) {
    
    // Modifiers held? Not interested; let the browser take it.
    if (e.shiftKey || e.ctrlKey || e.altKey) return;
    
    // Key not mapped? Again, not interested.
    const btnid = bByK[e.code];
    if (!btnid) return;
    
    // It is a mapped key, so stop the event.
    e.stopPropagation();
    e.preventDefault();
    
    // We're not forwarding events to the app. Rather, it polls a simple state field.
    this.state |= btnid;
  }
  
  onKeyUp(e) {
    const btnid = bByK[e.code];
    if (!btnid) return;
    this.state &= ~btnid;
  }
  
  /* Gamepad.
   *******************************************************************/
   
  onConn(e) {
    if (!e?.gamepad?.id || this.gpv[e.gamepad.index]) return;
    this.gpv[e.gamepad.index] = {
      id: e.gamepad.id,
      state: 0,
      a: e.gamepad.axes.map(v => v),
      b: e.gamepad.buttons.map(v => 0),
    };
  }
  
  onDis(e) {
    const gp = this.gpv[e.gamepad.index];
    if (!gp) return;
    this.gpv[e.gamepad.index] = 0;
    this.state &= ~gp.state;
  }
  
  updgp() {
    for (const src of navigator?.getGamepads?.() || []) {
      if (!src) continue;
      const gp = this.gpv[src.index];
      if (!gp) continue;
      
      /* Rather than polling axes and buttons generically, we'll pick off the interesting ones.
       * Generic is an option of course, but we're assuming Standard Mapping with hard-coded mapping beyond that.
       */
      
      const thr = 0.100;
      const ax = (n, bl, bh) => {
        if (src.axes[n] === gp.a[n]) return;
        const ov = (gp.a[n] < -thr) ? -1 : (gp.a[n] > thr) ? 1 : 0;
        const nv = (src.axes[n] < -thr) ? -1 : (src.axes[n] > thr) ? 1 : 0;
        if (ov !== nv) {
               if (ov < 0) { if (gp.state & bl) { this.state &= ~bl; gp.state &= ~bl; }}
          else if (ov > 0) { if (gp.state & bh) { this.state &= ~bh; gp.state &= ~bh; }}
               if (nv < 0) { if (!(gp.state & bl)) { this.state |= bl; gp.state |= bl; }}
          else if (nv > 0) { if (!(gp.state & bh)) { this.state |= bh; gp.state |= bh; }}
        }
        gp.a[n] = src.axes[n];
      };
      ax(0, K.LEFT, K.RIGHT);
      ax(1, K.UP, K.DOWN);
      const bt = (n, b) => {
        if (src.buttons[n].value === gp.b[n]) return;
        if (gp.b[n] = src.buttons[n].value) {
          if (!(gp.state & b)) {
            this.state |= b;
            gp.state |= b;
          }
        } else {
          if (gp.state & b) {
            this.state &= ~b;
            gp.state &= ~b;
          }
        }
      };
      bt(0, K.USE);
      bt(2, K.CHOOSE);
      bt(9, K.PAUSE);
      bt(11, K.QUIT);
      bt(12, K.UP);
      bt(13, K.DOWN);
      bt(14, K.LEFT);
      bt(15, K.RIGHT);
    }
  }
}
