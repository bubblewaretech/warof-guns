import { Graphics, Container, Texture, Sprite  } from 'pixi.js';
import { World } from '../engine/World.ts';
import playerImg from '../assets/sprites/player.png';
import {
  C,
  type TransformC,
  type VelocityC,
  type HealthC,
  type ColliderC,
  type PlayerC,
  type EnemyC,
  type ProjectileC,
  type SpriteC,
  type WallC,
  type SpikeC,
  type BossC,
  type BossType,
} from '../components/index.ts';
import {
  PLAYER_MAX_SPEED,
  PLAYER_FRICTION,
  PLAYER_RADIUS,
  PLAYER_MAX_HP,
  PROJECTILE_RADIUS,
  ENEMY_PROJECTILE_RADIUS,
  COLORS,
  ARENA_WIDTH,
  ARENA_HEIGHT,
  SPIKE_DAMAGE,
  SPIKE_COOLDOWN,
} from './constants.ts';

const PLAYER_COLORS = [COLORS.player, COLORS.player2];
import type { EnemyData, ObstacleRect } from '../data/types.ts';

// ── Player ────────────────────────────────────────────────────

export function createPlayer(
  world: World,
  container: Container,
  x: number,
  y: number,
  playerIndex: number = 0,
): number {
  const entity = world.spawn();

  world.add<TransformC>(entity, C.Transform, { x, y, rotation: 0 });
  world.add<VelocityC>(entity, C.Velocity, {
    vx: 0,
    vy: 0,
    maxSpeed: PLAYER_MAX_SPEED,
    friction: PLAYER_FRICTION,
  });
  world.add<HealthC>(entity, C.Health, {
    current: PLAYER_MAX_HP,
    max: PLAYER_MAX_HP,
    invincibleTimer: 0,
    flashTimer: 0,
  });
  world.add<ColliderC>(entity, C.Collider, { radius: PLAYER_RADIUS, layer: 'player' });
  world.add<PlayerC>(entity, C.Player, { aimAngle: 0, playerIndex });

  const gfx = new Graphics();
  if (playerIndex === 0) {
    drawPlayer(gfx, PLAYER_RADIUS);
  } else {
    drawPlayer2(gfx, PLAYER_RADIUS);
  }
  gfx.position.set(x, y);
  container.addChild(gfx);

  const baseColor = PLAYER_COLORS[playerIndex] ?? COLORS.player;
  world.add<SpriteC>(entity, C.Sprite, {
    gfx,
    baseColor,
    size: PLAYER_RADIUS,
  });

  return entity;
}

function drawPlayer(g: Graphics, r: number): void {
  // Replace vector art with image sprite
  const texture = Texture.from(playerImg);
  const sprite = new Sprite(texture);
  sprite.anchor.set(0.35, 0.5); // adjust for gun offset
  sprite.width = r * 3;    // scale to match hitbox
  sprite.height = r * 2.2;
  g.addChild(sprite);      // Graphics extends Container, so this works
}

function drawPlayer2(g: Graphics, r: number): void {
  // Same sprite as P1 but with blue tint
  const texture = Texture.from(playerImg);
  const sprite = new Sprite(texture);
  sprite.anchor.set(0.35, 0.5);
  sprite.width = r * 3;
  sprite.height = r * 2.2;
  sprite.tint = 0x6699ff; // Blue tint for P2
  g.addChild(sprite);
}


function drawPlayerGenerated(g: Graphics, r: number): void {
  // === Ground shadow ===
  g.beginFill(0x000000, 0.25);
  g.drawEllipse(0, r * 0.35, r * 0.9, r * 0.3);
  g.endFill();

  // === Body (torso) ===
  g.beginFill(0x1a7a1a);
  g.drawEllipse(0, 0, r, r * 0.95);
  g.endFill();
  // Body highlight
  g.beginFill(0x44dd44, 0.3);
  g.drawEllipse(-r * 0.15, -r * 0.25, r * 0.5, r * 0.4);
  g.endFill();

  // === Vest / armor plate ===
  g.beginFill(0x336633);
  g.drawRoundedRect(-r * 0.5, -r * 0.45, r * 1.0, r * 0.75, 3);
  g.endFill();
  // Vest centre stripe
  g.beginFill(0x44aa44, 0.35);
  g.drawRoundedRect(-r * 0.08, -r * 0.4, r * 0.16, r * 0.65, 1);
  g.endFill();

  // === Shoulder pads ===
  g.beginFill(0x2a6a2a);
  g.drawEllipse(-r * 0.65, -r * 0.1, r * 0.25, r * 0.18);
  g.drawEllipse(r * 0.65, -r * 0.1, r * 0.25, r * 0.18);
  g.endFill();

  // === Head ===
  g.beginFill(0xddbb88);
  g.drawCircle(0, -r * 0.08, r * 0.35);
  g.endFill();
  // Helmet
  g.beginFill(0x227722);
  g.drawEllipse(0, -r * 0.22, r * 0.38, r * 0.18);
  g.endFill();
  // Visor
  g.beginFill(0x115511);
  g.drawRoundedRect(-r * 0.35, -r * 0.3, r * 0.7, r * 0.1, 2);
  g.endFill();
  // Visor shine
  g.beginFill(0x88ffaa, 0.25);
  g.drawRoundedRect(-r * 0.2, -r * 0.3, r * 0.25, r * 0.04, 1);
  g.endFill();

  // === Eyes ===
  g.beginFill(0xffffff);
  g.drawEllipse(-r * 0.14, -r * 0.08, 2.5, 2);
  g.drawEllipse(r * 0.14, -r * 0.08, 2.5, 2);
  g.endFill();
  g.beginFill(0x111111);
  g.drawCircle(-r * 0.12, -r * 0.08, 1.2);
  g.drawCircle(r * 0.16, -r * 0.08, 1.2);
  g.endFill();

  // === Gun arm + barrel (points right; RenderSystem rotates) ===
  // Arm
  g.beginFill(0x1a7a1a);
  g.drawRoundedRect(r * 0.3, -r * 0.14, r * 0.45, r * 0.28, 3);
  g.endFill();
  // Gun body
  g.beginFill(0x555555);
  g.drawRoundedRect(r * 0.55, -r * 0.11, r * 0.55, r * 0.22, 2);
  g.endFill();
  // Gun grip
  g.beginFill(0x443322);
  g.drawRoundedRect(r * 0.6, r * 0.05, r * 0.14, r * 0.18, 1);
  g.endFill();
  // Barrel
  g.beginFill(0x888888);
  g.drawRoundedRect(r * 0.95, -r * 0.05, r * 0.5, r * 0.1, 1);
  g.endFill();
  // Barrel tip
  g.beginFill(0xaaaaaa);
  g.drawRoundedRect(r * 1.38, -r * 0.07, r * 0.1, r * 0.14, 1);
  g.endFill();

  // === Outline ===
  g.lineStyle(1.5, 0x115511, 0.5);
  g.drawEllipse(0, 0, r, r * 0.95);
}

// ── Enemy ─────────────────────────────────────────────────────

export function createEnemy(
  world: World,
  container: Container,
  x: number,
  y: number,
  data: EnemyData,
  hpMultiplier: number = 1,
  speedMultiplier: number = 1,
): number {
  const entity = world.spawn();
  const hp = Math.round(data.hp * hpMultiplier);

  world.add<TransformC>(entity, C.Transform, { x, y, rotation: 0 });
  world.add<VelocityC>(entity, C.Velocity, {
    vx: 0,
    vy: 0,
    maxSpeed: data.speed * speedMultiplier,
    friction: 6,
  });
  world.add<HealthC>(entity, C.Health, {
    current: hp,
    max: hp,
    invincibleTimer: 0,
    flashTimer: 0,
  });
  world.add<ColliderC>(entity, C.Collider, { radius: data.radius, layer: 'enemy' });
  world.add<EnemyC>(entity, C.Enemy, {
    enemyType: data.type,
    contactDamage: data.contactDamage,
    xpValue: data.xpValue,
    moneyValue: data.moneyValue,
    shootCooldown: data.shootCooldown ?? 999,
    shootTimer: (data.shootCooldown ?? 999) * 0.5, // stagger initial shots
    projectileDamage: data.projectileDamage ?? 0,
    projectileSpeed: data.projectileSpeed ?? 0,
    preferredDistance: data.preferredDistance ?? 0,
  });

  const color = parseInt(data.color);
  const gfx = new Graphics();
  drawEnemy(gfx, data.radius, data.type, color);
  gfx.position.set(x, y);
  container.addChild(gfx);

  world.add<SpriteC>(entity, C.Sprite, { gfx, baseColor: color, size: data.radius });

  return entity;
}

function drawEnemy(g: Graphics, r: number, type: string, color: number): void {
  // Detect enemy variant by colour for specialised art
  if (color === 0xff66aa) {
    drawRunner(g, r, color);
  } else if (color === 0x44aaaa) {
    drawShieldBrute(g, r, color);
  } else if (color === 0xffcc00) {
    drawExploder(g, r, color);
  } else if (color === 0x6666ff) {
    drawSniper(g, r, color);
  } else if (color === 0x66ff44) {
    drawSwarmBug(g, r, color);
  } else if (type === 'ranged') {
    drawShooter(g, r, color);
  } else {
    drawGrunt(g, r, color);
  }
}

/** Melee Grunt — stocky zombie/orc creature */
function drawGrunt(g: Graphics, r: number, color: number): void {
  // Ground shadow
  g.beginFill(0x000000, 0.2);
  g.drawEllipse(0, r * 0.35, r * 0.85, r * 0.25);
  g.endFill();

  // Body — wide & hunched
  g.beginFill(color);
  g.drawEllipse(0, r * 0.05, r, r * 0.9);
  g.endFill();
  // Dark belly
  g.beginFill(0x000000, 0.15);
  g.drawEllipse(0, r * 0.15, r * 0.6, r * 0.45);
  g.endFill();
  // Body highlight (upper left)
  g.beginFill(0xffffff, 0.1);
  g.drawEllipse(-r * 0.25, -r * 0.2, r * 0.4, r * 0.35);
  g.endFill();

  // Shoulder spikes
  g.beginFill(0xffffff, 0.25);
  g.moveTo(-r * 0.8, -r * 0.3);
  g.lineTo(-r * 1.05, -r * 0.7);
  g.lineTo(-r * 0.55, -r * 0.35);
  g.endFill();
  g.beginFill(0xffffff, 0.25);
  g.moveTo(r * 0.8, -r * 0.3);
  g.lineTo(r * 1.05, -r * 0.7);
  g.lineTo(r * 0.55, -r * 0.35);
  g.endFill();

  // Head
  g.beginFill(color);
  g.drawCircle(0, -r * 0.35, r * 0.45);
  g.endFill();
  // Brow ridge (dark)
  g.beginFill(0x000000, 0.25);
  g.drawEllipse(0, -r * 0.45, r * 0.4, r * 0.12);
  g.endFill();

  // Angry eyes — yellow with red pupils
  g.beginFill(0xffff44);
  g.drawEllipse(-r * 0.2, -r * 0.35, r * 0.13, r * 0.09);
  g.drawEllipse(r * 0.2, -r * 0.35, r * 0.13, r * 0.09);
  g.endFill();
  g.beginFill(0xcc0000);
  g.drawCircle(-r * 0.18, -r * 0.35, 2);
  g.drawCircle(r * 0.22, -r * 0.35, 2);
  g.endFill();

  // Mouth / jaw with teeth
  g.beginFill(0x220000);
  g.drawEllipse(0, -r * 0.15, r * 0.22, r * 0.08);
  g.endFill();
  // Teeth
  g.beginFill(0xeeeecc);
  for (let i = -2; i <= 2; i++) {
    g.drawRect(-r * 0.02 + i * r * 0.08, -r * 0.2, r * 0.05, r * 0.07);
  }
  g.endFill();

  // Outline
  g.lineStyle(1.5, 0x000000, 0.3);
  g.drawEllipse(0, r * 0.05, r, r * 0.9);
}

/** Ranged Shooter — hooded mage/cultist */
function drawShooter(g: Graphics, r: number, color: number): void {
  // Ground shadow
  g.beginFill(0x000000, 0.2);
  g.drawEllipse(0, r * 0.35, r * 0.75, r * 0.2);
  g.endFill();

  // Robe body — triangular/cloak shape
  g.beginFill(color);
  g.moveTo(0, -r * 0.7);
  g.lineTo(r * 0.85, r * 0.8);
  g.lineTo(-r * 0.85, r * 0.8);
  g.closePath();
  g.endFill();
  // Robe highlight
  g.beginFill(0xffffff, 0.08);
  g.moveTo(0, -r * 0.5);
  g.lineTo(r * 0.3, r * 0.5);
  g.lineTo(-r * 0.3, r * 0.5);
  g.closePath();
  g.endFill();
  // Robe dark folds
  g.lineStyle(1, 0x000000, 0.15);
  g.moveTo(-r * 0.15, -r * 0.3);
  g.lineTo(-r * 0.35, r * 0.7);
  g.moveTo(r * 0.15, -r * 0.3);
  g.lineTo(r * 0.35, r * 0.7);
  g.lineStyle(0);

  // Hood
  g.beginFill(color);
  g.drawEllipse(0, -r * 0.5, r * 0.45, r * 0.35);
  g.endFill();
  // Hood shadow (deep)
  g.beginFill(0x000000, 0.45);
  g.drawEllipse(0, -r * 0.4, r * 0.32, r * 0.22);
  g.endFill();

  // Glowing eyes in shadow
  g.beginFill(0xffaa00);
  g.drawCircle(-r * 0.12, -r * 0.42, 2.5);
  g.drawCircle(r * 0.12, -r * 0.42, 2.5);
  g.endFill();
  // Eye glow
  g.beginFill(0xffcc44, 0.3);
  g.drawCircle(-r * 0.12, -r * 0.42, 4.5);
  g.drawCircle(r * 0.12, -r * 0.42, 4.5);
  g.endFill();

  // Staff / wand (right side)
  g.lineStyle(2, 0x664422);
  g.moveTo(r * 0.4, -r * 0.3);
  g.lineTo(r * 0.5, r * 0.6);
  g.lineStyle(0);
  // Staff orb
  g.beginFill(0xff4444);
  g.drawCircle(r * 0.4, -r * 0.35, 3);
  g.endFill();
  g.beginFill(0xff8844, 0.4);
  g.drawCircle(r * 0.4, -r * 0.35, 5.5);
  g.endFill();

  // Outline
  g.lineStyle(1, 0x000000, 0.2);
  g.moveTo(0, -r * 0.7);
  g.lineTo(r * 0.85, r * 0.8);
  g.lineTo(-r * 0.85, r * 0.8);
  g.closePath();
}

/** Fast Runner — sleek, wolf-like beast */
function drawRunner(g: Graphics, r: number, color: number): void {
  // Ground shadow
  g.beginFill(0x000000, 0.2);
  g.drawEllipse(0, r * 0.3, r * 0.8, r * 0.2);
  g.endFill();

  // Tail (drawn behind body)
  g.lineStyle(2.5, color);
  g.moveTo(-r * 0.5, r * 0.1);
  g.quadraticCurveTo(-r * 1.2, -r * 0.3, -r * 0.9, -r * 0.7);
  g.lineStyle(0);

  // Body — elongated/sleek
  g.beginFill(color);
  g.drawEllipse(0, 0, r * 0.95, r * 0.7);
  g.endFill();
  // Belly — lighter
  g.beginFill(0xffffff, 0.12);
  g.drawEllipse(0, r * 0.1, r * 0.6, r * 0.35);
  g.endFill();
  // Back stripe (dark)
  g.beginFill(0x000000, 0.15);
  g.drawEllipse(0, -r * 0.2, r * 0.7, r * 0.12);
  g.endFill();

  // Head — pointed snout forward
  g.beginFill(color);
  g.drawEllipse(r * 0.45, -r * 0.1, r * 0.45, r * 0.35);
  g.endFill();
  // Snout
  g.beginFill(color);
  g.moveTo(r * 0.75, -r * 0.15);
  g.lineTo(r * 1.15, -r * 0.05);
  g.lineTo(r * 0.75, r * 0.08);
  g.closePath();
  g.endFill();
  // Nose
  g.beginFill(0x220011);
  g.drawCircle(r * 1.08, -r * 0.05, 1.5);
  g.endFill();

  // Ears
  g.beginFill(color);
  g.moveTo(r * 0.35, -r * 0.35);
  g.lineTo(r * 0.2, -r * 0.7);
  g.lineTo(r * 0.5, -r * 0.4);
  g.endFill();
  g.beginFill(color);
  g.moveTo(r * 0.55, -r * 0.35);
  g.lineTo(r * 0.65, -r * 0.7);
  g.lineTo(r * 0.7, -r * 0.35);
  g.endFill();
  // Inner ears
  g.beginFill(0xff88aa, 0.4);
  g.moveTo(r * 0.35, -r * 0.38);
  g.lineTo(r * 0.25, -r * 0.6);
  g.lineTo(r * 0.48, -r * 0.4);
  g.endFill();

  // Eye
  g.beginFill(0xffff44);
  g.drawEllipse(r * 0.55, -r * 0.15, r * 0.09, r * 0.07);
  g.endFill();
  g.beginFill(0x220000);
  g.drawCircle(r * 0.57, -r * 0.15, 1.5);
  g.endFill();

  // Fangs
  g.beginFill(0xeeeecc);
  g.moveTo(r * 0.85, -r * 0.02);
  g.lineTo(r * 0.82, r * 0.12);
  g.lineTo(r * 0.88, r * 0.0);
  g.endFill();
  g.beginFill(0xeeeecc);
  g.moveTo(r * 0.92, -r * 0.04);
  g.lineTo(r * 0.89, r * 0.08);
  g.lineTo(r * 0.95, -r * 0.02);
  g.endFill();

  // Legs (simple claws hinted)
  g.beginFill(color);
  g.drawEllipse(-r * 0.45, r * 0.45, r * 0.15, r * 0.2);
  g.drawEllipse(-r * 0.15, r * 0.45, r * 0.12, r * 0.2);
  g.drawEllipse(r * 0.15, r * 0.45, r * 0.12, r * 0.2);
  g.drawEllipse(r * 0.4, r * 0.45, r * 0.15, r * 0.2);
  g.endFill();

  // Outline
  g.lineStyle(1, 0x000000, 0.2);
  g.drawEllipse(0, 0, r * 0.95, r * 0.7);
}

/** Shield Brute — heavy armored tank */
function drawShieldBrute(g: Graphics, r: number, color: number): void {
  // Ground shadow
  g.beginFill(0x000000, 0.25);
  g.drawEllipse(0, r * 0.35, r * 0.95, r * 0.3);
  g.endFill();

  // Body — wide & bulky
  g.beginFill(color);
  g.drawEllipse(0, r * 0.05, r * 1.05, r * 0.95);
  g.endFill();
  // Dark belly
  g.beginFill(0x000000, 0.15);
  g.drawEllipse(0, r * 0.2, r * 0.7, r * 0.5);
  g.endFill();

  // Shield (front plate)
  g.beginFill(0x336666);
  g.drawRoundedRect(-r * 0.6, -r * 0.5, r * 1.2, r * 1.0, 4);
  g.endFill();
  // Shield highlight
  g.beginFill(0xffffff, 0.15);
  g.drawRoundedRect(-r * 0.45, -r * 0.4, r * 0.5, r * 0.7, 3);
  g.endFill();
  // Shield rivets
  g.beginFill(0x888888);
  g.drawCircle(-r * 0.45, -r * 0.35, 2);
  g.drawCircle(r * 0.45, -r * 0.35, 2);
  g.drawCircle(-r * 0.45, r * 0.35, 2);
  g.drawCircle(r * 0.45, r * 0.35, 2);
  g.endFill();
  // Shield cross emblem
  g.lineStyle(2, 0x88cccc, 0.5);
  g.moveTo(0, -r * 0.3);
  g.lineTo(0, r * 0.3);
  g.moveTo(-r * 0.25, 0);
  g.lineTo(r * 0.25, 0);
  g.lineStyle(0);

  // Head — small on top
  g.beginFill(color);
  g.drawCircle(0, -r * 0.55, r * 0.3);
  g.endFill();
  // Helmet
  g.beginFill(0x336666);
  g.drawEllipse(0, -r * 0.65, r * 0.32, r * 0.15);
  g.endFill();

  // Angry eyes — small slits
  g.beginFill(0xff4444);
  g.drawEllipse(-r * 0.12, -r * 0.55, r * 0.08, r * 0.04);
  g.drawEllipse(r * 0.12, -r * 0.55, r * 0.08, r * 0.04);
  g.endFill();

  // Shoulder pads (armored)
  g.beginFill(0x447777);
  g.drawEllipse(-r * 0.8, -r * 0.15, r * 0.25, r * 0.3);
  g.drawEllipse(r * 0.8, -r * 0.15, r * 0.25, r * 0.3);
  g.endFill();

  // Outline
  g.lineStyle(1.5, 0x000000, 0.3);
  g.drawEllipse(0, r * 0.05, r * 1.05, r * 0.95);
}

/** Exploder — volatile suicide rusher with glowing core */
function drawExploder(g: Graphics, r: number, color: number): void {
  // Ground shadow
  g.beginFill(0x000000, 0.2);
  g.drawEllipse(0, r * 0.3, r * 0.7, r * 0.2);
  g.endFill();

  // Outer glow (pulsing/dangerous aura)
  g.beginFill(color, 0.08);
  g.drawCircle(0, 0, r * 1.6);
  g.endFill();
  g.beginFill(0xff6600, 0.1);
  g.drawCircle(0, 0, r * 1.3);
  g.endFill();

  // Body — round, volatile-looking
  g.beginFill(color);
  g.drawCircle(0, 0, r * 0.9);
  g.endFill();
  // Dark cracks
  g.lineStyle(1, 0xff6600, 0.6);
  g.moveTo(-r * 0.3, -r * 0.4);
  g.lineTo(-r * 0.1, 0);
  g.lineTo(-r * 0.4, r * 0.3);
  g.moveTo(r * 0.2, -r * 0.5);
  g.lineTo(r * 0.1, -r * 0.1);
  g.lineTo(r * 0.35, r * 0.2);
  g.lineStyle(0);

  // Glowing core
  g.beginFill(0xff4400, 0.5);
  g.drawCircle(0, 0, r * 0.45);
  g.endFill();
  g.beginFill(0xffffff, 0.4);
  g.drawCircle(0, -r * 0.05, r * 0.2);
  g.endFill();

  // Eyes — wide, frantic
  g.beginFill(0xff0000);
  g.drawCircle(-r * 0.25, -r * 0.2, r * 0.12);
  g.drawCircle(r * 0.25, -r * 0.2, r * 0.12);
  g.endFill();
  g.beginFill(0xffffff);
  g.drawCircle(-r * 0.23, -r * 0.22, r * 0.05);
  g.drawCircle(r * 0.27, -r * 0.22, r * 0.05);
  g.endFill();

  // Mouth — open scream
  g.beginFill(0x660000);
  g.drawEllipse(0, r * 0.1, r * 0.15, r * 0.12);
  g.endFill();

  // Fuse sparks on top
  g.beginFill(0xffff00, 0.8);
  g.drawCircle(0, -r * 0.75, r * 0.08);
  g.endFill();
  g.beginFill(0xffffff, 0.5);
  g.drawCircle(r * 0.05, -r * 0.8, r * 0.04);
  g.endFill();
  // Fuse line
  g.lineStyle(1.5, 0x444444);
  g.moveTo(0, -r * 0.5);
  g.quadraticCurveTo(r * 0.1, -r * 0.65, 0, -r * 0.75);
  g.lineStyle(0);

  // Outline
  g.lineStyle(1.5, 0x000000, 0.25);
  g.drawCircle(0, 0, r * 0.9);
}

/** Sniper — cloaked long-range marksman */
function drawSniper(g: Graphics, r: number, color: number): void {
  // Ground shadow
  g.beginFill(0x000000, 0.2);
  g.drawEllipse(0, r * 0.35, r * 0.7, r * 0.2);
  g.endFill();

  // Cloak body — tall, narrow
  g.beginFill(color);
  g.moveTo(0, -r * 0.8);
  g.lineTo(r * 0.65, r * 0.85);
  g.lineTo(-r * 0.65, r * 0.85);
  g.closePath();
  g.endFill();
  // Cloak folds
  g.lineStyle(1, 0x000000, 0.1);
  g.moveTo(-r * 0.1, -r * 0.4);
  g.lineTo(-r * 0.3, r * 0.7);
  g.moveTo(r * 0.1, -r * 0.4);
  g.lineTo(r * 0.25, r * 0.7);
  g.lineStyle(0);
  // Cloak highlight
  g.beginFill(0xffffff, 0.06);
  g.moveTo(0, -r * 0.6);
  g.lineTo(r * 0.2, r * 0.5);
  g.lineTo(-r * 0.2, r * 0.5);
  g.closePath();
  g.endFill();

  // Hood
  g.beginFill(color);
  g.drawEllipse(0, -r * 0.55, r * 0.38, r * 0.3);
  g.endFill();
  // Hood shadow
  g.beginFill(0x000000, 0.5);
  g.drawEllipse(0, -r * 0.45, r * 0.28, r * 0.18);
  g.endFill();

  // Scope/eye — single glowing lens
  g.beginFill(0xff0000);
  g.drawCircle(0, -r * 0.48, 3);
  g.endFill();
  // Scope glow
  g.beginFill(0xff0000, 0.2);
  g.drawCircle(0, -r * 0.48, 6);
  g.endFill();

  // Rifle (right side, long barrel)
  g.lineStyle(2.5, 0x444444);
  g.moveTo(r * 0.35, -r * 0.2);
  g.lineTo(r * 0.6, r * 0.5);
  g.lineStyle(0);
  // Barrel extends forward
  g.beginFill(0x555555);
  g.drawRoundedRect(r * 0.28, -r * 0.45, r * 0.12, r * 0.8, 1);
  g.endFill();
  // Scope on rifle
  g.beginFill(0x333366);
  g.drawRoundedRect(r * 0.22, -r * 0.35, r * 0.22, r * 0.1, 2);
  g.endFill();
  // Scope lens
  g.beginFill(0x88aaff, 0.5);
  g.drawCircle(r * 0.22, -r * 0.3, 2);
  g.endFill();

  // Outline
  g.lineStyle(1, 0x000000, 0.2);
  g.moveTo(0, -r * 0.8);
  g.lineTo(r * 0.65, r * 0.85);
  g.lineTo(-r * 0.65, r * 0.85);
  g.closePath();
}

/** Swarm Bug — tiny insectoid creature */
function drawSwarmBug(g: Graphics, r: number, color: number): void {
  // Ground shadow
  g.beginFill(0x000000, 0.15);
  g.drawEllipse(0, r * 0.25, r * 0.7, r * 0.15);
  g.endFill();

  // Wings (behind body)
  g.beginFill(0xffffff, 0.15);
  g.drawEllipse(-r * 0.5, -r * 0.3, r * 0.45, r * 0.25);
  g.drawEllipse(r * 0.5, -r * 0.3, r * 0.45, r * 0.25);
  g.endFill();
  g.lineStyle(0.5, 0xffffff, 0.2);
  g.drawEllipse(-r * 0.5, -r * 0.3, r * 0.45, r * 0.25);
  g.drawEllipse(r * 0.5, -r * 0.3, r * 0.45, r * 0.25);
  g.lineStyle(0);

  // Abdomen (back segment)
  g.beginFill(color);
  g.drawEllipse(0, r * 0.15, r * 0.5, r * 0.4);
  g.endFill();
  // Stripe pattern
  g.beginFill(0x000000, 0.2);
  g.drawEllipse(0, r * 0.1, r * 0.45, r * 0.08);
  g.drawEllipse(0, r * 0.3, r * 0.35, r * 0.06);
  g.endFill();

  // Thorax (front segment)
  g.beginFill(color);
  g.drawEllipse(0, -r * 0.2, r * 0.4, r * 0.35);
  g.endFill();
  // Highlight
  g.beginFill(0xffffff, 0.15);
  g.drawEllipse(-r * 0.1, -r * 0.3, r * 0.2, r * 0.15);
  g.endFill();

  // Head — small with big eyes
  g.beginFill(color);
  g.drawCircle(0, -r * 0.5, r * 0.22);
  g.endFill();

  // Compound eyes — large and buggy
  g.beginFill(0x000000);
  g.drawCircle(-r * 0.15, -r * 0.52, r * 0.12);
  g.drawCircle(r * 0.15, -r * 0.52, r * 0.12);
  g.endFill();
  g.beginFill(0xaaffaa, 0.5);
  g.drawCircle(-r * 0.13, -r * 0.54, r * 0.05);
  g.drawCircle(r * 0.17, -r * 0.54, r * 0.05);
  g.endFill();

  // Antennae
  g.lineStyle(0.8, color);
  g.moveTo(-r * 0.1, -r * 0.65);
  g.lineTo(-r * 0.3, -r * 0.9);
  g.moveTo(r * 0.1, -r * 0.65);
  g.lineTo(r * 0.3, -r * 0.9);
  g.lineStyle(0);
  // Antenna tips
  g.beginFill(color);
  g.drawCircle(-r * 0.3, -r * 0.9, r * 0.05);
  g.drawCircle(r * 0.3, -r * 0.9, r * 0.05);
  g.endFill();

  // Legs (3 pairs)
  g.lineStyle(0.7, 0x338833);
  g.moveTo(-r * 0.35, -r * 0.1);
  g.lineTo(-r * 0.7, r * 0.1);
  g.moveTo(-r * 0.3, r * 0.1);
  g.lineTo(-r * 0.65, r * 0.35);
  g.moveTo(-r * 0.25, r * 0.25);
  g.lineTo(-r * 0.55, r * 0.5);
  g.moveTo(r * 0.35, -r * 0.1);
  g.lineTo(r * 0.7, r * 0.1);
  g.moveTo(r * 0.3, r * 0.1);
  g.lineTo(r * 0.65, r * 0.35);
  g.moveTo(r * 0.25, r * 0.25);
  g.lineTo(r * 0.55, r * 0.5);
  g.lineStyle(0);
}

// ── Projectile ────────────────────────────────────────────────

export function createProjectile(
  world: World,
  container: Container,
  x: number,
  y: number,
  vx: number,
  vy: number,
  damage: number,
  owner: 'player' | 'enemy',
  customColor?: number,
  weaponId?: string,
  explosionRadius?: number,
): number {
  const entity = world.spawn();
  const isPlayer = owner === 'player';
  const radius = isPlayer ? PROJECTILE_RADIUS : ENEMY_PROJECTILE_RADIUS;
  const angle = Math.atan2(vy, vx);

  world.add<TransformC>(entity, C.Transform, { x, y, rotation: 0 });
  world.add<VelocityC>(entity, C.Velocity, {
    vx,
    vy,
    maxSpeed: 9999,
    friction: 0,
  });
  world.add<ColliderC>(entity, C.Collider, {
    radius,
    layer: isPlayer ? 'playerProjectile' : 'enemyProjectile',
  });

  const color = customColor ?? (isPlayer ? COLORS.playerBullet : COLORS.enemyBullet);
  world.add<ProjectileC>(entity, C.Projectile, {
    damage,
    owner,
    lifetime: 3.0,
    explosionRadius: explosionRadius ?? 0,
    explosionColor: color,
  });

  const gfx = new Graphics();
  drawProjectile(gfx, radius, color, angle, weaponId);
  gfx.position.set(x, y);
  container.addChild(gfx);

  world.add<SpriteC>(entity, C.Sprite, { gfx, baseColor: color, size: radius });

  return entity;
}

function drawProjectile(g: Graphics, r: number, color: number, angle: number, weaponId?: string): void {
  switch (weaponId) {
    case 'rocket': {
      // Elongated rocket with fins and fire trail
      g.rotation = angle;
      // Exhaust glow
      g.beginFill(0xff6600, 0.15);
      g.drawCircle(-r * 3, 0, r * 3);
      g.endFill();
      g.beginFill(0xff4400, 0.3);
      g.drawCircle(-r * 1.5, 0, r * 1.5);
      g.endFill();
      // Body
      g.beginFill(0x888888);
      g.drawRoundedRect(-r * 1.5, -r * 0.7, r * 4, r * 1.4, 3);
      g.endFill();
      // Nose cone
      g.beginFill(color);
      g.moveTo(r * 2.5, 0);
      g.lineTo(r * 1.8, -r * 0.7);
      g.lineTo(r * 1.8, r * 0.7);
      g.closePath();
      g.endFill();
      // Fins
      g.beginFill(0x666666);
      g.moveTo(-r * 1.5, -r * 0.5);
      g.lineTo(-r * 2.2, -r * 1.5);
      g.lineTo(-r * 0.8, -r * 0.5);
      g.endFill();
      g.beginFill(0x666666);
      g.moveTo(-r * 1.5, r * 0.5);
      g.lineTo(-r * 2.2, r * 1.5);
      g.lineTo(-r * 0.8, r * 0.5);
      g.endFill();
      break;
    }
    case 'grenade': {
      // Round grenade blob with ring
      g.beginFill(color, 0.15);
      g.drawCircle(0, 0, r * 3);
      g.endFill();
      // Body
      g.beginFill(0x556b2f);
      g.drawCircle(0, 0, r * 1.4);
      g.endFill();
      // Highlight
      g.beginFill(color, 0.5);
      g.drawCircle(-r * 0.3, -r * 0.3, r * 0.6);
      g.endFill();
      // Ring/band
      g.lineStyle(1.5, 0x333333);
      g.drawCircle(0, 0, r * 1.2);
      g.lineStyle(0);
      // Fuse spark
      g.beginFill(0xffff00, 0.8);
      g.drawCircle(0, -r * 1.4, r * 0.4);
      g.endFill();
      break;
    }
    case 'laser': {
      // Thin elongated beam
      g.rotation = angle;
      // Outer glow
      g.beginFill(color, 0.1);
      g.drawRoundedRect(-r * 4, -r * 1.5, r * 8, r * 3, 4);
      g.endFill();
      g.beginFill(color, 0.3);
      g.drawRoundedRect(-r * 3, -r * 0.8, r * 6, r * 1.6, 3);
      g.endFill();
      // Core beam
      g.beginFill(0xffffff);
      g.drawRoundedRect(-r * 2.5, -r * 0.3, r * 5, r * 0.6, 2);
      g.endFill();
      // Bright tip
      g.beginFill(color);
      g.drawCircle(r * 2, 0, r * 0.5);
      g.endFill();
      break;
    }
    case 'waveGun': {
      // Arc/crescent wave shape
      g.rotation = angle;
      // Glow
      g.beginFill(color, 0.12);
      g.drawCircle(0, 0, r * 3.5);
      g.endFill();
      // Crescent
      g.beginFill(color, 0.6);
      g.arc(0, 0, r * 2, -0.8, 0.8);
      g.lineTo(0, 0);
      g.closePath();
      g.endFill();
      // Bright edge
      g.beginFill(0xffffff, 0.5);
      g.arc(0, 0, r * 1.8, -0.5, 0.5);
      g.lineTo(0, 0);
      g.closePath();
      g.endFill();
      break;
    }
    case 'pulseGun': {
      // Ring/pulse shape
      g.beginFill(color, 0.08);
      g.drawCircle(0, 0, r * 3);
      g.endFill();
      // Outer ring
      g.lineStyle(2, color, 0.6);
      g.drawCircle(0, 0, r * 1.8);
      g.lineStyle(0);
      // Inner ring
      g.lineStyle(1.5, 0xffffff, 0.4);
      g.drawCircle(0, 0, r * 1.0);
      g.lineStyle(0);
      // Core dot
      g.beginFill(color);
      g.drawCircle(0, 0, r * 0.5);
      g.endFill();
      g.beginFill(0xffffff, 0.6);
      g.drawCircle(0, 0, r * 0.25);
      g.endFill();
      break;
    }
    default: {
      // Default bullet (pistol, smg, shotgun, enemy, etc.)
      g.beginFill(color, 0.12);
      g.drawCircle(0, 0, r * 3.5);
      g.endFill();
      g.beginFill(color, 0.25);
      g.drawCircle(0, 0, r * 2.2);
      g.endFill();
      g.beginFill(color);
      g.drawCircle(0, 0, r);
      g.endFill();
      g.beginFill(0xffffff, 0.7);
      g.drawCircle(0, 0, r * 0.45);
      g.endFill();
      break;
    }
  }
}

// ── Wall ──────────────────────────────────────────────────────

export function createWall(
  world: World,
  container: Container,
  rect: ObstacleRect,
): number {
  const entity = world.spawn();

  // Transform is at top-left corner of the wall
  world.add<TransformC>(entity, C.Transform, { x: rect.x, y: rect.y, rotation: 0 });
  world.add<WallC>(entity, C.Wall, { width: rect.w, height: rect.h });

  // No visual — walls are drawn by ArenaRenderer on the background layer
  return entity;
}

// ── Spike ─────────────────────────────────────────────────────

export function createSpike(
  world: World,
  container: Container,
  rect: ObstacleRect,
): number {
  const entity = world.spawn();

  world.add<TransformC>(entity, C.Transform, { x: rect.x, y: rect.y, rotation: 0 });
  world.add<SpikeC>(entity, C.Spike, {
    width: rect.w,
    height: rect.h,
    damage: SPIKE_DAMAGE,
    damageCooldown: SPIKE_COOLDOWN,
    lastHitTimers: new Map(),
  });

  return entity;
}

// ── Boss ──────────────────────────────────────────────────────

export function createBoss(
  world: World,
  container: Container,
  x: number,
  y: number,
  data: EnemyData,
  bossType: BossType = 'dungeonLord',
): number {
  const entity = world.spawn();
  const hp = data.hp;

  world.add<TransformC>(entity, C.Transform, { x, y, rotation: 0 });
  world.add<VelocityC>(entity, C.Velocity, {
    vx: 0,
    vy: 0,
    maxSpeed: data.speed,
    friction: 6,
  });
  world.add<HealthC>(entity, C.Health, {
    current: hp,
    max: hp,
    invincibleTimer: 0,
    flashTimer: 0,
  });
  world.add<ColliderC>(entity, C.Collider, { radius: data.radius, layer: 'boss' });
  // Boss also has enemy component for collision compatibility
  world.add<EnemyC>(entity, C.Enemy, {
    enemyType: 'melee',
    contactDamage: data.contactDamage,
    xpValue: data.xpValue,
    moneyValue: data.moneyValue,
    shootCooldown: 999,
    shootTimer: 999,
    projectileDamage: data.projectileDamage ?? 0,
    projectileSpeed: data.projectileSpeed ?? 0,
    preferredDistance: 0,
  });
  world.add<BossC>(entity, C.Boss, {
    bossType,
    phase: 'idle',
    phaseTimer: 0,
    idleTimer: 2.0,
    phaseCycle: 0,
    chargeTargetX: x,
    chargeTargetY: y,
    spiralAngle: 0,
    spiralShotTimer: 0,
    summoned: false,
    slamLanded: false,
    breathAngle: 0,
    breathShotTimer: 0,
    dashCount: 0,
    meteorLanded: false,
    shockwaveLanded: false,
    wallSpawned: false,
    laserAngle: 0,
    laserShotTimer: 0,
  });

  const color = parseInt(data.color);
  const gfx = new Graphics();
  if (bossType === 'infernoWyrm') {
    drawInfernoWyrm(gfx, data.radius, color);
  } else if (bossType === 'crystalGolem') {
    drawCrystalGolem(gfx, data.radius, color);
  } else {
    drawBoss(gfx, data.radius, color);
  }
  gfx.position.set(x, y);
  container.addChild(gfx);

  world.add<SpriteC>(entity, C.Sprite, { gfx, baseColor: color, size: data.radius });

  return entity;
}

function drawBoss(g: Graphics, r: number, color: number): void {
  const sides = 6;

  // === Outer pulsing aura (multiple rings) ===
  g.beginFill(color, 0.06);
  g.drawCircle(0, 0, r + 20);
  g.endFill();
  g.beginFill(color, 0.1);
  g.drawCircle(0, 0, r + 12);
  g.endFill();

  // === Ground shadow ===
  g.beginFill(0x000000, 0.3);
  g.drawEllipse(0, r * 0.3, r * 0.9, r * 0.25);
  g.endFill();

  // === Tattered cape / wings (behind body) ===
  g.beginFill(0x330066, 0.6);
  // Left wing
  g.moveTo(-r * 0.3, -r * 0.2);
  g.quadraticCurveTo(-r * 1.3, -r * 0.5, -r * 1.1, r * 0.4);
  g.lineTo(-r * 0.8, r * 0.6);
  g.lineTo(-r * 0.5, r * 0.3);
  g.lineTo(-r * 0.3, r * 0.1);
  g.closePath();
  g.endFill();
  g.beginFill(0x330066, 0.6);
  // Right wing
  g.moveTo(r * 0.3, -r * 0.2);
  g.quadraticCurveTo(r * 1.3, -r * 0.5, r * 1.1, r * 0.4);
  g.lineTo(r * 0.8, r * 0.6);
  g.lineTo(r * 0.5, r * 0.3);
  g.lineTo(r * 0.3, r * 0.1);
  g.closePath();
  g.endFill();

  // === Main body — hexagonal ===
  g.beginFill(color);
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
  g.endFill();

  // Body shading — dark lower half
  g.beginFill(0x000000, 0.2);
  g.drawEllipse(0, r * 0.2, r * 0.8, r * 0.5);
  g.endFill();
  // Body highlight — bright upper
  g.beginFill(0xffffff, 0.08);
  g.drawEllipse(-r * 0.15, -r * 0.3, r * 0.5, r * 0.35);
  g.endFill();

  // === Inner arcane pattern ===
  g.lineStyle(1.5, 0xffcc00, 0.25);
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
    const px = Math.cos(angle) * r * 0.5;
    const py = Math.sin(angle) * r * 0.5;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
  g.lineStyle(0);
  // Centre jewel
  g.beginFill(0xff00ff, 0.6);
  g.drawCircle(0, r * 0.05, r * 0.12);
  g.endFill();
  g.beginFill(0xffffff, 0.3);
  g.drawCircle(-r * 0.03, 0, r * 0.05);
  g.endFill();

  // === Armored pauldrons ===
  g.beginFill(0x666699);
  g.drawEllipse(-r * 0.75, -r * 0.2, r * 0.22, r * 0.28);
  g.drawEllipse(r * 0.75, -r * 0.2, r * 0.22, r * 0.28);
  g.endFill();
  // Pauldron spikes
  g.beginFill(0x888888);
  g.moveTo(-r * 0.75, -r * 0.45);
  g.lineTo(-r * 0.8, -r * 0.75);
  g.lineTo(-r * 0.65, -r * 0.45);
  g.endFill();
  g.beginFill(0x888888);
  g.moveTo(r * 0.75, -r * 0.45);
  g.lineTo(r * 0.8, -r * 0.75);
  g.lineTo(r * 0.65, -r * 0.45);
  g.endFill();

  // === Head ===
  g.beginFill(0x440088);
  g.drawCircle(0, -r * 0.4, r * 0.35);
  g.endFill();
  // Face plate
  g.beginFill(0x220044);
  g.drawRoundedRect(-r * 0.28, -r * 0.55, r * 0.56, r * 0.25, 3);
  g.endFill();

  // === Crown / horns — three-pronged ===
  g.beginFill(0xffcc00);
  // Left horn
  g.moveTo(-r * 0.35, -r * 0.65);
  g.lineTo(-r * 0.45, -r * 1.2);
  g.lineTo(-r * 0.2, -r * 0.7);
  g.endFill();
  // Centre horn
  g.beginFill(0xffdd33);
  g.moveTo(-r * 0.1, -r * 0.7);
  g.lineTo(0, -r * 1.35);
  g.lineTo(r * 0.1, -r * 0.7);
  g.endFill();
  // Right horn
  g.beginFill(0xffcc00);
  g.moveTo(r * 0.2, -r * 0.7);
  g.lineTo(r * 0.45, -r * 1.2);
  g.lineTo(r * 0.35, -r * 0.65);
  g.endFill();

  // === Eyes — menacing red with glow ===
  // Glow
  g.beginFill(0xff0000, 0.25);
  g.drawCircle(-r * 0.15, -r * 0.4, 8);
  g.drawCircle(r * 0.15, -r * 0.4, 8);
  g.endFill();
  // Eye whites
  g.beginFill(0xff2200);
  g.drawEllipse(-r * 0.15, -r * 0.4, 5, 3.5);
  g.drawEllipse(r * 0.15, -r * 0.4, 5, 3.5);
  g.endFill();
  // Pupils
  g.beginFill(0xffffff);
  g.drawCircle(-r * 0.14, -r * 0.4, 2);
  g.drawCircle(r * 0.16, -r * 0.4, 2);
  g.endFill();

  // === Mouth — jagged snarl ===
  g.beginFill(0x110022);
  g.drawEllipse(0, -r * 0.25, r * 0.18, r * 0.06);
  g.endFill();
  g.beginFill(0xddddbb);
  for (let i = -2; i <= 2; i++) {
    g.moveTo(i * r * 0.07 - r * 0.02, -r * 0.29);
    g.lineTo(i * r * 0.07, -r * 0.2);
    g.lineTo(i * r * 0.07 + r * 0.02, -r * 0.29);
  }
  g.endFill();

  // === Outline ===
  g.lineStyle(2, 0xffffff, 0.2);
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
}

/** Inferno Wyrm — serpentine fire dragon boss */
function drawInfernoWyrm(g: Graphics, r: number, color: number): void {
  // Outer fire aura
  g.beginFill(0xff6600, 0.06);
  g.drawCircle(0, 0, r + 22);
  g.endFill();
  g.beginFill(0xff4400, 0.1);
  g.drawCircle(0, 0, r + 14);
  g.endFill();

  // Ground shadow
  g.beginFill(0x000000, 0.3);
  g.drawEllipse(0, r * 0.3, r * 0.95, r * 0.25);
  g.endFill();

  // Wings — fiery bat wings
  g.beginFill(0x881100, 0.7);
  g.moveTo(-r * 0.3, -r * 0.1);
  g.quadraticCurveTo(-r * 1.4, -r * 0.8, -r * 1.2, r * 0.1);
  g.lineTo(-r * 0.9, r * 0.3);
  g.lineTo(-r * 0.6, r * 0.0);
  g.closePath();
  g.endFill();
  g.beginFill(0x881100, 0.7);
  g.moveTo(r * 0.3, -r * 0.1);
  g.quadraticCurveTo(r * 1.4, -r * 0.8, r * 1.2, r * 0.1);
  g.lineTo(r * 0.9, r * 0.3);
  g.lineTo(r * 0.6, r * 0.0);
  g.closePath();
  g.endFill();
  // Wing membrane veins
  g.lineStyle(1, 0xff6600, 0.3);
  g.moveTo(-r * 0.5, -r * 0.1);
  g.lineTo(-r * 1.1, -r * 0.3);
  g.moveTo(r * 0.5, -r * 0.1);
  g.lineTo(r * 1.1, -r * 0.3);
  g.lineStyle(0);

  // Body — elongated serpentine
  g.beginFill(color);
  g.drawEllipse(0, 0, r * 0.85, r);
  g.endFill();
  // Belly scales
  g.beginFill(0xff8833, 0.3);
  g.drawEllipse(0, r * 0.15, r * 0.5, r * 0.55);
  g.endFill();
  // Body highlight
  g.beginFill(0xffffff, 0.08);
  g.drawEllipse(-r * 0.15, -r * 0.3, r * 0.4, r * 0.35);
  g.endFill();

  // Scale pattern
  g.lineStyle(1, 0xff2200, 0.15);
  for (let i = -2; i <= 2; i++) {
    g.drawEllipse(0, i * r * 0.22, r * 0.6, r * 0.1);
  }
  g.lineStyle(0);

  // Head — angular dragon
  g.beginFill(color);
  g.drawEllipse(0, -r * 0.55, r * 0.45, r * 0.38);
  g.endFill();
  // Snout
  g.beginFill(color);
  g.moveTo(-r * 0.2, -r * 0.75);
  g.lineTo(0, -r * 1.05);
  g.lineTo(r * 0.2, -r * 0.75);
  g.closePath();
  g.endFill();
  // Nostrils with smoke
  g.beginFill(0xff6600, 0.6);
  g.drawCircle(-r * 0.08, -r * 0.9, 2);
  g.drawCircle(r * 0.08, -r * 0.9, 2);
  g.endFill();

  // Horns — curved back
  g.beginFill(0x440000);
  g.moveTo(-r * 0.3, -r * 0.7);
  g.quadraticCurveTo(-r * 0.6, -r * 1.3, -r * 0.35, -r * 1.15);
  g.lineTo(-r * 0.2, -r * 0.75);
  g.endFill();
  g.beginFill(0x440000);
  g.moveTo(r * 0.3, -r * 0.7);
  g.quadraticCurveTo(r * 0.6, -r * 1.3, r * 0.35, -r * 1.15);
  g.lineTo(r * 0.2, -r * 0.75);
  g.endFill();

  // Eyes — molten orange
  g.beginFill(0xff6600, 0.3);
  g.drawCircle(-r * 0.18, -r * 0.55, 7);
  g.drawCircle(r * 0.18, -r * 0.55, 7);
  g.endFill();
  g.beginFill(0xffaa00);
  g.drawEllipse(-r * 0.18, -r * 0.55, 4.5, 3);
  g.drawEllipse(r * 0.18, -r * 0.55, 4.5, 3);
  g.endFill();
  g.beginFill(0xffffff);
  g.drawCircle(-r * 0.16, -r * 0.56, 1.5);
  g.drawCircle(r * 0.2, -r * 0.56, 1.5);
  g.endFill();

  // Mouth — open with fire
  g.beginFill(0x220000);
  g.drawEllipse(0, -r * 0.4, r * 0.2, r * 0.08);
  g.endFill();
  g.beginFill(0xff4400, 0.4);
  g.drawEllipse(0, -r * 0.4, r * 0.15, r * 0.05);
  g.endFill();

  // Tail (curving down)
  g.lineStyle(4, color);
  g.moveTo(0, r * 0.7);
  g.quadraticCurveTo(r * 0.4, r * 1.3, r * 0.15, r * 1.1);
  g.lineStyle(0);
  // Tail flame tip
  g.beginFill(0xff6600, 0.7);
  g.drawCircle(r * 0.15, r * 1.1, 4);
  g.endFill();

  // Outline
  g.lineStyle(2, 0xff6600, 0.2);
  g.drawEllipse(0, 0, r * 0.85, r);
}

/** Crystal Golem — massive crystalline tank boss */
function drawCrystalGolem(g: Graphics, r: number, color: number): void {
  // Outer crystal shimmer
  g.beginFill(0x00aaff, 0.06);
  g.drawCircle(0, 0, r + 24);
  g.endFill();
  g.beginFill(color, 0.1);
  g.drawCircle(0, 0, r + 15);
  g.endFill();

  // Ground shadow
  g.beginFill(0x000000, 0.35);
  g.drawEllipse(0, r * 0.35, r * 1.0, r * 0.3);
  g.endFill();

  // Body — massive angular/crystalline
  g.beginFill(color);
  // Octagonal body
  const sides = 8;
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
  g.endFill();

  // Crystal facet highlights
  g.beginFill(0xffffff, 0.12);
  g.moveTo(-r * 0.1, -r * 0.9);
  g.lineTo(r * 0.3, -r * 0.4);
  g.lineTo(-r * 0.2, r * 0.1);
  g.lineTo(-r * 0.5, -r * 0.3);
  g.closePath();
  g.endFill();
  g.beginFill(0x000000, 0.15);
  g.moveTo(r * 0.1, r * 0.1);
  g.lineTo(r * 0.7, r * 0.3);
  g.lineTo(r * 0.4, r * 0.8);
  g.lineTo(-r * 0.1, r * 0.5);
  g.closePath();
  g.endFill();

  // Crystal crack lines
  g.lineStyle(1.5, 0x00ffff, 0.3);
  g.moveTo(-r * 0.4, -r * 0.6);
  g.lineTo(0, 0);
  g.lineTo(r * 0.5, r * 0.4);
  g.moveTo(r * 0.3, -r * 0.5);
  g.lineTo(0, 0);
  g.lineTo(-r * 0.4, r * 0.5);
  g.lineStyle(0);

  // Crystal shoulder spires
  g.beginFill(0x0088cc);
  g.moveTo(-r * 0.7, -r * 0.3);
  g.lineTo(-r * 1.0, -r * 1.0);
  g.lineTo(-r * 0.5, -r * 0.5);
  g.endFill();
  g.beginFill(0x0088cc);
  g.moveTo(r * 0.7, -r * 0.3);
  g.lineTo(r * 1.0, -r * 1.0);
  g.lineTo(r * 0.5, -r * 0.5);
  g.endFill();
  // Crystal tips glow
  g.beginFill(0x88eeff, 0.5);
  g.drawCircle(-r * 1.0, -r * 1.0, 3);
  g.drawCircle(r * 1.0, -r * 1.0, 3);
  g.endFill();

  // Head — geometric crystal
  g.beginFill(0x006699);
  // Diamond shaped head
  g.moveTo(0, -r * 0.95);
  g.lineTo(r * 0.3, -r * 0.55);
  g.lineTo(0, -r * 0.35);
  g.lineTo(-r * 0.3, -r * 0.55);
  g.closePath();
  g.endFill();
  // Head facet
  g.beginFill(0xffffff, 0.1);
  g.moveTo(0, -r * 0.95);
  g.lineTo(r * 0.15, -r * 0.6);
  g.lineTo(0, -r * 0.45);
  g.lineTo(-r * 0.1, -r * 0.7);
  g.closePath();
  g.endFill();

  // Eyes — glowing cyan slits
  g.beginFill(0x00ffff, 0.3);
  g.drawCircle(-r * 0.12, -r * 0.6, 6);
  g.drawCircle(r * 0.12, -r * 0.6, 6);
  g.endFill();
  g.beginFill(0x00ffff);
  g.drawEllipse(-r * 0.12, -r * 0.6, 4, 2.5);
  g.drawEllipse(r * 0.12, -r * 0.6, 4, 2.5);
  g.endFill();
  g.beginFill(0xffffff);
  g.drawCircle(-r * 0.1, -r * 0.61, 1.5);
  g.drawCircle(r * 0.14, -r * 0.61, 1.5);
  g.endFill();

  // Core crystal — center chest
  g.beginFill(0x00ffff, 0.4);
  g.moveTo(0, -r * 0.2);
  g.lineTo(r * 0.15, r * 0.05);
  g.lineTo(0, r * 0.3);
  g.lineTo(-r * 0.15, r * 0.05);
  g.closePath();
  g.endFill();
  g.beginFill(0xffffff, 0.5);
  g.drawCircle(0, r * 0.05, r * 0.06);
  g.endFill();

  // Fists / arms
  g.beginFill(0x0099bb);
  g.drawEllipse(-r * 0.75, r * 0.15, r * 0.22, r * 0.3);
  g.drawEllipse(r * 0.75, r * 0.15, r * 0.22, r * 0.3);
  g.endFill();

  // Outline
  g.lineStyle(2, 0x00ffff, 0.2);
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
}

// ── Spawn Position ────────────────────────────────────────────

export function randomEdgePosition(): { x: number; y: number } {
  const edge = Math.floor(Math.random() * 4);
  const margin = 30;
  switch (edge) {
    case 0:
      return { x: Math.random() * ARENA_WIDTH, y: margin };
    case 1:
      return { x: Math.random() * ARENA_WIDTH, y: ARENA_HEIGHT - margin };
    case 2:
      return { x: margin, y: Math.random() * ARENA_HEIGHT };
    case 3:
      return { x: ARENA_WIDTH - margin, y: Math.random() * ARENA_HEIGHT };
    default:
      return { x: ARENA_WIDTH / 2, y: margin };
  }
}
