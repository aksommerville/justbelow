/* Input.js
 * TODO Gamepad
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
    
    this.state = 0; // bitfields, K.*
    
    addEventListener("keydown", e => this.onKeyDown(e));
    addEventListener("keyup", e => this.onKeyUp(e));
  }
  
  update(el) {
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
}
