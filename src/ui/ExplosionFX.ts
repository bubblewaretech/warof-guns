import { Container, Graphics } from 'pixi.js';

interface Explosion {
  x: number;
  y: number;
  radius: number;
  timer: number;
  color: number;
}

const EXPLOSION_DURATION = 0.3; // seconds

export class ExplosionFX {
  private active: Explosion[] = [];
  private gfx: Graphics;

  constructor(private container: Container) {
    this.gfx = new Graphics();
    container.addChild(this.gfx);
  }

  spawn(x: number, y: number, radius: number, color: number): void {
    this.active.push({ x, y, radius, timer: EXPLOSION_DURATION, color });
  }

  update(dt: number): void {
    this.gfx.clear();

    for (let i = this.active.length - 1; i >= 0; i--) {
      const e = this.active[i];
      e.timer -= dt;

      if (e.timer <= 0) {
        this.active.splice(i, 1);
        continue;
      }

      // Progress: 0 (just started) → 1 (about to end)
      const progress = 1 - e.timer / EXPLOSION_DURATION;
      const currentRadius = e.radius * progress;
      const alpha = 0.6 * (1 - progress);

      // Outer glow ring
      this.gfx.lineStyle(3, e.color, alpha * 0.8);
      this.gfx.drawCircle(e.x, e.y, currentRadius);
      this.gfx.lineStyle(0);

      // Filled inner blast
      this.gfx.beginFill(e.color, alpha * 0.4);
      this.gfx.drawCircle(e.x, e.y, currentRadius * 0.7);
      this.gfx.endFill();

      // Bright center flash (fades quickly)
      if (progress < 0.4) {
        const flashAlpha = 0.8 * (1 - progress / 0.4);
        this.gfx.beginFill(0xffffff, flashAlpha);
        this.gfx.drawCircle(e.x, e.y, currentRadius * 0.3);
        this.gfx.endFill();
      }
    }
  }

  clear(): void {
    this.active = [];
    this.gfx.clear();
  }

  /** Remove graphics from container (for cleanup on restart). */
  destroy(): void {
    this.clear();
    if (this.gfx.parent) {
      this.gfx.parent.removeChild(this.gfx);
    }
    this.gfx.destroy();
  }
}
