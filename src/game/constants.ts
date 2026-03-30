export const CANVAS_WIDTH = 1024;
export const CANVAS_HEIGHT = 768;
export const ARENA_WIDTH = 2000;
export const ARENA_HEIGHT = 1500;

export const PLAYER_MAX_SPEED = 250;
export const PLAYER_ACCEL = 1800;
export const PLAYER_FRICTION = 10;
export const PLAYER_RADIUS = 16;
export const PLAYER_MAX_HP = 25;

export const PROJECTILE_RADIUS = 4;
export const ENEMY_PROJECTILE_RADIUS = 5;

export const WAVE_END_DELAY = 1.5; // seconds after last enemy dies before shop
export const INVINCIBLE_DURATION = 0.5; // seconds of invincibility after player hit
export const HIT_FLASH_DURATION = 0.12; // seconds of flash on enemy hit

export const MELEE_SWING_VISUAL_DURATION = 0.15;

export const COLORS = {
  player: 0x44ff44,
  player2: 0x4488ff,
  playerOutline: 0x228822,
  playerBullet: 0xffff44,
  enemyBullet: 0xff4444,
  meleeSwing: 0xffffff,
  xpBar: 0x44aaff,
  hpBarGreen: 0x44ff44,
  hpBarRed: 0xff4444,
  moneyText: 0xffcc00,
  arenaFloor: 0x1a1a2e,
  arenaGrid: 0x222244,
  arenaBorder: 0x444488,
  // Dungeon
  dungeonFloor1: 0x2a2a3e,
  dungeonFloor2: 0x252538,
  dungeonFloor3: 0x1e1e30,
  dungeonWall: 0x555577,
  dungeonWallTop: 0x6666aa,
  dungeonSpike: 0xaa4444,
  dungeonSpikeShine: 0xcc6666,
  bossBar: 0xff2222,
  bossBarBg: 0x333333,
} as const;

export const SPIKE_DAMAGE = 3;
export const SPIKE_COOLDOWN = 0.8; // seconds between spike hits on same entity
