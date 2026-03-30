export interface GunData {
  name: string;
  baseDamage: number;
  fireRate: number;
  ammoMax: number;
  range: number;
  projectileSpeed: number;
  price: number;
  ammoPrice: number;
  ammoPurchaseAmount: number;
  pellets?: number;
  spread?: number;
  projectileColor?: string;
  explosionRadius?: number;
  upgradeScaling: {
    damage: number;
    fireRate: number;
    ammoMax: number;
  };
}

export interface MeleeData {
  name: string;
  baseDamage: number;
  cooldown: number;
  range: number;
  arc: number;
  knockback: number;
  price: number;
  upgradeScaling: {
    damage: number;
    cooldown: number;
  };
}

export interface WeaponsData {
  guns: Record<string, GunData>;
  melee: Record<string, MeleeData>;
}

export interface EnemyData {
  name: string;
  type: 'melee' | 'ranged';
  hp: number;
  speed: number;
  contactDamage: number;
  xpValue: number;
  moneyValue: number;
  radius: number;
  color: string;
  projectileDamage?: number;
  projectileSpeed?: number;
  shootCooldown?: number;
  preferredDistance?: number;
}

export type EnemiesData = Record<string, EnemyData>;

export interface SpawnGroup {
  enemy: string;
  count: number;
  delay: number;
}

export interface WaveConfig {
  wave: number;
  groups: SpawnGroup[];
  boss?: boolean;
}

export interface WavesData {
  waves: WaveConfig[];
  scalingPerWaveBeyond10: {
    enemyCountMultiplier: number;
    enemyHpMultiplier: number;
  };
}

export interface ObstacleRect {
  x: number;
  y: number;
  w: number;
  h: number;
}
