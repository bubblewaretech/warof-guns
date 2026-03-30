import type { GunData, MeleeData, WeaponsData } from '../data/types.ts';
import type { PlayerState } from './GameState.ts';

// ── XP / Level ────────────────────────────────────────────────

/** XP required to reach a given level (1-indexed). Level 1 = 0 XP. */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  // Quadratic scaling: each level costs more
  return Math.floor(20 * (level - 1) + 5 * (level - 1) * (level - 1));
}

/** Check if current XP is enough to level up. Returns number of new levels gained. */
export function checkLevelUp(currentXp: number, currentLevel: number): number {
  let levelsGained = 0;
  let threshold = xpForLevel(currentLevel + 1);
  const xp = currentXp;
  let lvl = currentLevel;
  while (xp >= threshold) {
    levelsGained++;
    lvl++;
    threshold = xpForLevel(lvl + 1);
  }
  return levelsGained;
}

// ── Weapon Stats ──────────────────────────────────────────────

export interface EffectiveGunStats {
  damage: number;
  fireRate: number;
  ammoMax: number;
  range: number;
  projectileSpeed: number;
  pellets: number;
  spread: number;
  explosionRadius: number;
}

export function getGunStats(gunId: string, level: number, weapons: WeaponsData): EffectiveGunStats {
  const base: GunData = weapons.guns[gunId];
  return {
    damage: Math.max(1, Math.round(base.baseDamage + base.upgradeScaling.damage * level)),
    fireRate: Math.max(0.04, base.fireRate + base.upgradeScaling.fireRate * level),
    ammoMax: Math.max(1, base.ammoMax + Math.floor(base.upgradeScaling.ammoMax * level)),
    range: base.range,
    projectileSpeed: base.projectileSpeed,
    pellets: base.pellets ?? 1,
    spread: base.spread ?? 0,
    explosionRadius: base.explosionRadius ?? 0,
  };
}

export interface EffectiveMeleeStats {
  damage: number;
  cooldown: number;
  range: number;
  arc: number;
  knockback: number;
}

export function getMeleeStats(
  meleeId: string,
  level: number,
  weapons: WeaponsData,
): EffectiveMeleeStats {
  const base: MeleeData = weapons.melee[meleeId];
  return {
    damage: Math.max(1, Math.round(base.baseDamage + base.upgradeScaling.damage * level)),
    cooldown: Math.max(0.08, base.cooldown + base.upgradeScaling.cooldown * level),
    range: base.range,
    arc: base.arc,
    knockback: base.knockback,
  };
}

// ── Shop Validation ───────────────────────────────────────────

export interface PurchaseResult {
  success: boolean;
  reason?: string;
}

export function canBuyWeapon(
  money: number,
  weaponId: string,
  slotType: 'gun' | 'melee',
  ownedIds: string[],
  weapons: WeaponsData,
): PurchaseResult {
  if (ownedIds.includes(weaponId)) {
    return { success: false, reason: 'Already owned' };
  }
  const data = slotType === 'gun' ? weapons.guns[weaponId] : weapons.melee[weaponId];
  if (!data) return { success: false, reason: 'Unknown weapon' };
  if (money < data.price) {
    return { success: false, reason: 'Not enough money' };
  }
  return { success: true };
}

export function canBuyAmmo(
  money: number,
  gunId: string,
  currentAmmo: number,
  weapons: WeaponsData,
  gunLevel: number,
): PurchaseResult {
  const gun = weapons.guns[gunId];
  if (!gun) return { success: false, reason: 'Unknown gun' };
  const stats = getGunStats(gunId, gunLevel, weapons);
  if (currentAmmo >= stats.ammoMax) {
    return { success: false, reason: 'Ammo full' };
  }
  if (money < gun.ammoPrice) {
    return { success: false, reason: 'Not enough money' };
  }
  return { success: true };
}

// ── Upgrade Choices ───────────────────────────────────────────

/** Cost in upgrade points to level a weapon from its current level. */
export function getUpgradeCost(weaponLevel: number): number {
  return weaponLevel + 1;
}

export interface UpgradeChoice {
  id: string;
  type: 'gun' | 'melee';
  title: string;
  description: string;
  cost: number;
  apply: () => void;
}

/** Generate an upgrade choice for every owned weapon (guns + melee). */
export function generateAllUpgradeChoices(
  ps: PlayerState,
  weapons: WeaponsData,
): UpgradeChoice[] {
  const choices: UpgradeChoice[] = [];

  // All owned guns
  for (const gunId of ps.ownedGunIds) {
    const gun = weapons.guns[gunId];
    if (!gun) continue;
    const inst = ps.gunBank[gunId];
    if (!inst) continue;
    const lvl = inst.level;
    const cost = getUpgradeCost(lvl);
    const curr = getGunStats(gunId, lvl, weapons);
    const next = getGunStats(gunId, lvl + 1, weapons);

    choices.push({
      id: `gun_${gunId}`,
      type: 'gun',
      title: `${gun.name} Lv${lvl}`,
      description: `Dmg ${curr.damage}\u2192${next.damage}, Rate ${curr.fireRate.toFixed(2)}s\u2192${next.fireRate.toFixed(2)}s, Ammo ${curr.ammoMax}\u2192${next.ammoMax}`,
      cost,
      apply: () => { inst.level++; },
    });
  }

  // All owned melee
  for (const meleeId of ps.ownedMeleeIds) {
    const melee = weapons.melee[meleeId];
    if (!melee) continue;
    const inst = ps.meleeBank[meleeId];
    if (!inst) continue;
    const lvl = inst.level;
    const cost = getUpgradeCost(lvl);
    const curr = getMeleeStats(meleeId, lvl, weapons);
    const next = getMeleeStats(meleeId, lvl + 1, weapons);

    choices.push({
      id: `melee_${meleeId}`,
      type: 'melee',
      title: `${melee.name} Lv${lvl}`,
      description: `Dmg ${curr.damage}\u2192${next.damage}, CD ${curr.cooldown.toFixed(2)}s\u2192${next.cooldown.toFixed(2)}s`,
      cost,
      apply: () => { inst.level++; },
    });
  }

  return choices;
}
