/* Hero.js
 * Controller for the hero sprite.
 */
 
import { K } from "./Input.js";
 
export class Hero {
  constructor(app, x, y) {
    this.app = app;
    this.x = x;
    this.y = y;
    
    this.pvinput = this.app.input.state;
  }
  
  update(el) {
    if (this.app.input.state !== this.pvinput) {
      if ((this.app.input.state & K.USE) && !(this.pvinput & K.USE)) this.onUse();
      else if (!(this.app.input.state & K.USE) && (this.pvinput & K.USE)) this.onUnuse();
      this.pvinput = this.app.input.state;
    }
    
    const speed = 6.000;
    switch (this.app.input.state & (K.LEFT | K.RIGHT)) {
      case K.LEFT: this.x -= speed * el; break;
      case K.RIGHT: this.x += speed * el; break;
    }
    switch (this.app.input.state & (K.UP | K.DOWN)) {
      case K.UP: this.y -= speed * el; break;
      case K.DOWN: this.y += speed * el; break;
    }
  }
  
  onUse() {
    console.log(`onUse`);//TODO
  }
  
  onUnuse() {
    console.log(`onUnuse`);//TODO
  }
}
