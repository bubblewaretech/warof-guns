import { Container, Text } from 'pixi.js';

interface DmgNum {
  text: Text;
  life: number;
  vy: number;
}

const MAX_LIFE = 0.8;

export class DamageNumbers {
  private active: DmgNum[] = [];

  constructor(private container: Container) {}

  spawn(x: number, y: number, amount: number, isPlayerDmg = false): void {
    const text = new Text(String(amount), {
      fontSize: isPlayerDmg ? 20 : 16,
      fontFamily: 'monospace',
      fontWeight: 'bold',
      fill: isPlayerDmg ? '#ff4444' : '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    });
    text.anchor.set(0.5);
    text.position.set(x + (Math.random() - 0.5) * 20, y - 10);
    this.container.addChild(text);

    this.active.push({ text, life: MAX_LIFE, vy: -60 - Math.random() * 30 });
  }

  update(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const d = this.active[i];
      d.life -= dt;
      d.text.y += d.vy * dt;
      d.vy += 40 * dt; // gentle gravity
      d.text.alpha = Math.max(0, d.life / MAX_LIFE);

      if (d.life <= 0) {
        this.container.removeChild(d.text);
        d.text.destroy();
        this.active.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const d of this.active) {
      this.container.removeChild(d.text);
      d.text.destroy();
    }
    this.active = [];
  }
}
