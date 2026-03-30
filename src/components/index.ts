import { Graphics } from 'pixi.js';

/** Component key constants. */
export const C = {
  Transform: 'transform',
  Velocity: 'velocity',
  Health: 'health',
  Collider: 'collider',
  Player: 'player',
  Enemy: 'enemy',
  Projectile: 'projectile',
  Sprite: 'sprite',
  Wall: 'wall',
  Spike: 'spike',
  Boss: 'boss',
} as const;

export interface TransformC {
  x: number;
  y: number;
  rotation: number;
}

export interface VelocityC {
  vx: number;
  vy: number;
  maxSpeed: number;
  friction: number;
}

export interface HealthC {
  current: number;
  max: number;
  invincibleTimer: number;
  flashTimer: number;
}

export interface ColliderC {
  radius: number;
  layer: 'player' | 'enemy' | 'playerProjectile' | 'enemyProjectile' | 'boss';
}

export interface PlayerC {
  aimAngle: number;
  playerIndex: number; // 0 = P1, 1 = P2
}

export interface EnemyC {
  enemyType: 'melee' | 'ranged';
  contactDamage: number;
  xpValue: number;
  moneyValue: number;
  shootCooldown: number;
  shootTimer: number;
  projectileDamage: number;
  projectileSpeed: number;
  preferredDistance: number;
}

export interface ProjectileC {
  damage: number;
  owner: 'player' | 'enemy';
  ownerPlayerIndex?: number; // 0 or 1, only set when owner === 'player'
  lifetime: number;
  explosionRadius?: number; // >0 = explode on impact, dealing AOE damage
  explosionColor?: number;  // color for explosion visual
}

export interface SpriteC {
  gfx: Graphics;
  baseColor: number;
  size: number;
}

export interface WallC {
  width: number;
  height: number;
}

export interface SpikeC {
  width: number;
  height: number;
  damage: number;
  damageCooldown: number;
  /** Tracks per-entity last-hit time to avoid rapid re-damage */
  lastHitTimers: Map<number, number>;
}

export type BossPhase = 'charge' | 'spiral' | 'summon' | 'slam' | 'idle'
  | 'flameBreath' | 'dashTrail' | 'meteor'
  | 'shockwave' | 'crystalWall' | 'laserSweep';

export type BossType = 'dungeonLord' | 'infernoWyrm' | 'crystalGolem';

export interface BossC {
  bossType: BossType;
  phase: BossPhase;
  phaseTimer: number;
  idleTimer: number;
  phaseCycle: number;  // which phase cycle we're on
  chargeTargetX: number;
  chargeTargetY: number;
  spiralAngle: number;
  spiralShotTimer: number;
  summoned: boolean;
  slamLanded: boolean;
  // Inferno Wyrm fields
  breathAngle: number;
  breathShotTimer: number;
  dashCount: number;
  meteorLanded: boolean;
  // Crystal Golem fields
  shockwaveLanded: boolean;
  wallSpawned: boolean;
  laserAngle: number;
  laserShotTimer: number;
}
