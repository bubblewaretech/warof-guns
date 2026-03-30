export class Vec2 {
  constructor(
    public x: number = 0,
    public y: number = 0,
  ) {}

  add(v: Vec2): Vec2 {
    return new Vec2(this.x + v.x, this.y + v.y);
  }

  sub(v: Vec2): Vec2 {
    return new Vec2(this.x - v.x, this.y - v.y);
  }

  scale(s: number): Vec2 {
    return new Vec2(this.x * s, this.y * s);
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  lengthSq(): number {
    return this.x * this.x + this.y * this.y;
  }

  normalize(): Vec2 {
    const len = this.length();
    if (len < 0.0001) return new Vec2();
    return new Vec2(this.x / len, this.y / len);
  }

  distanceTo(v: Vec2): number {
    return this.sub(v).length();
  }

  distanceSqTo(v: Vec2): number {
    return this.sub(v).lengthSq();
  }

  dot(v: Vec2): number {
    return this.x * v.x + this.y * v.y;
  }

  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  rotate(angle: number): Vec2 {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Vec2(this.x * cos - this.y * sin, this.x * sin + this.y * cos);
  }

  clone(): Vec2 {
    return new Vec2(this.x, this.y);
  }

  static fromAngle(angle: number, length: number = 1): Vec2 {
    return new Vec2(Math.cos(angle) * length, Math.sin(angle) * length);
  }

  static lerp(a: Vec2, b: Vec2, t: number): Vec2 {
    return new Vec2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
  }
}

/** Normalize an angle to [-PI, PI]. */
export function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}
