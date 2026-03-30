/**
 * requestAnimationFrame-based game loop with capped delta time.
 * Prevents spiral-of-death by capping dt at 50ms.
 */
export class GameLoop {
  private lastTime = 0;
  private running = false;
  private rafId = 0;

  constructor(private updateFn: (dt: number) => void) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private tick = (now: number): void => {
    if (!this.running) return;
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    this.updateFn(dt);
    this.rafId = requestAnimationFrame(this.tick);
  };
}
