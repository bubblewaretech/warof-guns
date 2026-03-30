import { describe, it, expect } from 'vitest';
import { xpForLevel, checkLevelUp, getGunStats, getMeleeStats } from '../src/game/rules.ts';
import type { WeaponsData } from '../src/data/types.ts';

const mockWeapons: WeaponsData = {
  guns: {
    pistol: {
      name: 'Pistol',
      baseDamage: 5,
      fireRate: 0.35,
      ammoMax: 30,
      range: 400,
      projectileSpeed: 500,
      price: 0,
      ammoPrice: 10,
      ammoPurchaseAmount: 15,
      upgradeScaling: { damage: 2, fireRate: -0.04, ammoMax: 5 },
    },
  },
  melee: {
    sword: {
      name: 'Sword',
      baseDamage: 8,
      cooldown: 0.45,
      range: 55,
      arc: 90,
      knockback: 120,
      price: 0,
      upgradeScaling: { damage: 3, cooldown: -0.04 },
    },
  },
};

describe('xpForLevel', () => {
  it('level 1 requires 0 XP', () => {
    expect(xpForLevel(1)).toBe(0);
  });

  it('level 2 requires some positive XP', () => {
    expect(xpForLevel(2)).toBeGreaterThan(0);
  });

  it('each level requires more XP than the previous', () => {
    for (let i = 2; i <= 10; i++) {
      expect(xpForLevel(i + 1)).toBeGreaterThan(xpForLevel(i));
    }
  });

  it('returns 0 for level <= 1', () => {
    expect(xpForLevel(0)).toBe(0);
    expect(xpForLevel(-1)).toBe(0);
  });
});

describe('checkLevelUp', () => {
  it('returns 0 when XP is below threshold', () => {
    expect(checkLevelUp(0, 1)).toBe(0);
  });

  it('returns 1 when XP reaches next level', () => {
    const threshold = xpForLevel(2);
    expect(checkLevelUp(threshold, 1)).toBe(1);
  });

  it('returns multiple levels when XP is very high', () => {
    const bigXp = xpForLevel(5);
    const levels = checkLevelUp(bigXp, 1);
    expect(levels).toBeGreaterThanOrEqual(3);
  });
});

describe('getGunStats', () => {
  it('returns base stats at level 0', () => {
    const stats = getGunStats('pistol', 0, mockWeapons);
    expect(stats.damage).toBe(5);
    expect(stats.fireRate).toBe(0.35);
    expect(stats.ammoMax).toBe(30);
  });

  it('scales damage with level', () => {
    const lvl0 = getGunStats('pistol', 0, mockWeapons);
    const lvl3 = getGunStats('pistol', 3, mockWeapons);
    expect(lvl3.damage).toBe(lvl0.damage + 2 * 3);
  });

  it('reduces fire rate (faster) with level', () => {
    const lvl0 = getGunStats('pistol', 0, mockWeapons);
    const lvl5 = getGunStats('pistol', 5, mockWeapons);
    expect(lvl5.fireRate).toBeLessThan(lvl0.fireRate);
  });

  it('never allows fire rate below minimum', () => {
    const stats = getGunStats('pistol', 100, mockWeapons);
    expect(stats.fireRate).toBeGreaterThanOrEqual(0.04);
  });

  it('increases ammo capacity with level', () => {
    const lvl0 = getGunStats('pistol', 0, mockWeapons);
    const lvl2 = getGunStats('pistol', 2, mockWeapons);
    expect(lvl2.ammoMax).toBe(lvl0.ammoMax + 5 * 2);
  });
});

describe('getMeleeStats', () => {
  it('returns base stats at level 0', () => {
    const stats = getMeleeStats('sword', 0, mockWeapons);
    expect(stats.damage).toBe(8);
    expect(stats.cooldown).toBe(0.45);
    expect(stats.range).toBe(55);
  });

  it('increases damage and reduces cooldown per level', () => {
    const lvl0 = getMeleeStats('sword', 0, mockWeapons);
    const lvl3 = getMeleeStats('sword', 3, mockWeapons);
    expect(lvl3.damage).toBeGreaterThan(lvl0.damage);
    expect(lvl3.cooldown).toBeLessThan(lvl0.cooldown);
  });

  it('cooldown never goes below minimum', () => {
    const stats = getMeleeStats('sword', 100, mockWeapons);
    expect(stats.cooldown).toBeGreaterThanOrEqual(0.08);
  });
});
