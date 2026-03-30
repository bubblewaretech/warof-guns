import { describe, it, expect } from 'vitest';
import { canBuyWeapon, canBuyAmmo } from '../src/game/rules.ts';
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
    smg: {
      name: 'SMG',
      baseDamage: 3,
      fireRate: 0.12,
      ammoMax: 60,
      range: 300,
      projectileSpeed: 550,
      price: 75,
      ammoPrice: 20,
      ammoPurchaseAmount: 30,
      upgradeScaling: { damage: 1, fireRate: -0.015, ammoMax: 10 },
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
    bat: {
      name: 'Bat',
      baseDamage: 12,
      cooldown: 0.7,
      range: 65,
      arc: 130,
      knockback: 200,
      price: 60,
      upgradeScaling: { damage: 4, cooldown: -0.06 },
    },
  },
};

describe('canBuyWeapon', () => {
  it('rejects buying already owned weapon', () => {
    const result = canBuyWeapon(1000, 'pistol', 'gun', ['pistol'], mockWeapons);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('Already owned');
  });

  it('rejects purchase without enough money', () => {
    const result = canBuyWeapon(50, 'smg', 'gun', ['pistol'], mockWeapons);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('Not enough money');
  });

  it('allows purchase with exact money', () => {
    const result = canBuyWeapon(75, 'smg', 'gun', ['pistol'], mockWeapons);
    expect(result.success).toBe(true);
  });

  it('allows purchase with more than enough money', () => {
    const result = canBuyWeapon(200, 'smg', 'gun', ['pistol'], mockWeapons);
    expect(result.success).toBe(true);
  });

  it('allows free weapons when not already owned', () => {
    const result = canBuyWeapon(0, 'pistol', 'gun', ['smg'], mockWeapons);
    expect(result.success).toBe(true);
  });

  it('rejects unknown weapon', () => {
    const result = canBuyWeapon(1000, 'unknown', 'gun', ['pistol'], mockWeapons);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('Unknown weapon');
  });

  it('works for melee weapons', () => {
    const result = canBuyWeapon(60, 'bat', 'melee', ['sword'], mockWeapons);
    expect(result.success).toBe(true);
  });

  it('rejects melee purchase without enough money', () => {
    const result = canBuyWeapon(30, 'bat', 'melee', ['sword'], mockWeapons);
    expect(result.success).toBe(false);
  });

  it('rejects buying weapon already in owned list', () => {
    const result = canBuyWeapon(1000, 'smg', 'gun', ['pistol', 'smg'], mockWeapons);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('Already owned');
  });
});

describe('canBuyAmmo', () => {
  it('allows buying ammo when below max', () => {
    const result = canBuyAmmo(100, 'pistol', 10, mockWeapons, 0);
    expect(result.success).toBe(true);
  });

  it('rejects buying ammo when full', () => {
    const result = canBuyAmmo(100, 'pistol', 30, mockWeapons, 0);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('Ammo full');
  });

  it('rejects buying ammo without enough money', () => {
    const result = canBuyAmmo(5, 'pistol', 10, mockWeapons, 0);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('Not enough money');
  });

  it('accounts for level-based ammo max increase', () => {
    // At level 0, pistol max = 30. At level 2, max = 30 + 5*2 = 40.
    // So 35 ammo is full at level 0 but not at level 2.
    const fullAtLv0 = canBuyAmmo(100, 'pistol', 30, mockWeapons, 0);
    expect(fullAtLv0.success).toBe(false);

    const notFullAtLv2 = canBuyAmmo(100, 'pistol', 35, mockWeapons, 2);
    expect(notFullAtLv2.success).toBe(true);
  });

  it('rejects unknown gun', () => {
    const result = canBuyAmmo(100, 'railgun', 0, mockWeapons, 0);
    expect(result.success).toBe(false);
  });
});
