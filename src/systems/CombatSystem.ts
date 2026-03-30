import { Container } from 'pixi.js';
import { World } from '../engine/World.ts';
import { Vec2 } from '../engine/Vec2.ts';
import { normalizeAngle } from '../engine/Vec2.ts';
import {
  C,
  type TransformC,
  type PlayerC,
  type HealthC,
} from '../components/index.ts';
import type { GameState, PlayerState } from '../game/GameState.ts';
import { activeGun } from '../game/GameState.ts';
import type { WeaponsData } from '../data/types.ts';
import { getGunStats, getMeleeStats } from '../game/rules.ts';
import { createProjectile } from '../game/spawner.ts';
import { HIT_FLASH_DURATION, MELEE_SWING_VISUAL_DURATION, COLORS } from '../game/constants.ts';
import { SFX } from '../sfx.ts';
import type { DamageNumbers } from '../ui/DamageNumbers.ts';

export interface PlayerCombatInput {
  playerState: PlayerState;
  shootHeld: boolean;
  meleePressed: boolean;
}

export class CombatSystem {
  constructor(
    private world: World,
    private state: GameState,
    private weapons: WeaponsData,
    private gameLayer: Container,
    private damageNumbers: DamageNumbers,
  ) {}

  update(dt: number, inputs: PlayerCombatInput[]): void {
    for (const { playerState: ps, shootHeld, meleePressed } of inputs) {
      if (!ps.alive) continue;

      // Tick ALL gun cooldowns (so inactive gun cools down too)
      for (let i = 0; i < ps.gunCooldowns.length; i++) {
        ps.gunCooldowns[i] = Math.max(0, ps.gunCooldowns[i] - dt);
      }
      ps.meleeCooldown = Math.max(0, ps.meleeCooldown - dt);
      ps.meleeSwingTimer = Math.max(0, ps.meleeSwingTimer - dt);

      if (shootHeld) this.tryShoot(ps);
      if (meleePressed) this.tryMelee(ps);
    }
  }

  private tryShoot(ps: PlayerState): void {
    const gunIndex = ps.activeGunIndex;
    if (ps.gunCooldowns[gunIndex] > 0) return;

    const gun = activeGun(ps);
    if (!gun) return;
    if (gun.currentAmmo <= 0) {
      SFX.emptyGun();
      return;
    }

    const stats = getGunStats(gun.id, gun.level, this.weapons);
    const transform = this.world.get<TransformC>(ps.entityId, C.Transform)!;
    const player = this.world.get<PlayerC>(ps.entityId, C.Player)!;

    // Get weapon-specific projectile color
    const gunData = this.weapons.guns[gun.id];
    const projColor = gunData.projectileColor
      ? parseInt(gunData.projectileColor)
      : COLORS.playerBullet;

    // Fire projectile(s)
    for (let i = 0; i < stats.pellets; i++) {
      const spread = stats.pellets > 1
        ? (i - (stats.pellets - 1) / 2) * stats.spread
        : 0;
      const angle = player.aimAngle + spread;
      const dir = Vec2.fromAngle(angle);

      createProjectile(
        this.world,
        this.gameLayer,
        transform.x + dir.x * 20,
        transform.y + dir.y * 20,
        dir.x * stats.projectileSpeed,
        dir.y * stats.projectileSpeed,
        stats.damage,
        'player',
        projColor,
        gun.id,
        stats.explosionRadius > 0 ? stats.explosionRadius : undefined,
      );
    }

    gun.currentAmmo--;
    ps.gunCooldowns[gunIndex] = stats.fireRate;
    SFX.shoot();
  }

  private tryMelee(ps: PlayerState): void {
    if (ps.meleeCooldown > 0) return;

    const melee = ps.melee;
    const stats = getMeleeStats(melee.id, melee.level, this.weapons);
    const transform = this.world.get<TransformC>(ps.entityId, C.Transform)!;
    const player = this.world.get<PlayerC>(ps.entityId, C.Player)!;
    const playerPos = new Vec2(transform.x, transform.y);

    // Set swing visual
    ps.meleeSwingTimer = MELEE_SWING_VISUAL_DURATION;
    ps.meleeSwingAngle = player.aimAngle;
    ps.meleeCooldown = stats.cooldown;
    SFX.meleeSwing();

    // Check all enemies in arc
    const arcRad = (stats.arc * Math.PI) / 180;
    for (const enemy of this.world.query(C.Transform, C.Health, C.Enemy)) {
      const et = this.world.get<TransformC>(enemy, C.Transform)!;
      const enemyPos = new Vec2(et.x, et.y);
      const toEnemy = enemyPos.sub(playerPos);
      const dist = toEnemy.length();

      if (dist > stats.range + 20) continue; // +20 for enemy radius

      // Check angle
      const enemyAngle = Math.atan2(toEnemy.y, toEnemy.x);
      const angleDiff = normalizeAngle(enemyAngle - player.aimAngle);
      if (Math.abs(angleDiff) > arcRad / 2) continue;

      // Apply damage
      const hp = this.world.get<HealthC>(enemy, C.Health)!;
      hp.current -= stats.damage;
      hp.flashTimer = HIT_FLASH_DURATION;
      SFX.hit();

      // Knockback
      if (stats.knockback > 0) {
        const vel = this.world.get(enemy, C.Velocity) as { vx: number; vy: number } | undefined;
        if (vel) {
          const kb = toEnemy.normalize().scale(stats.knockback);
          vel.vx += kb.x;
          vel.vy += kb.y;
        }
      }

      this.damageNumbers.spawn(et.x, et.y, stats.damage);
    }
  }
}
