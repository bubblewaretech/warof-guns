import { World } from '../engine/World.ts';
import {
  C,
  type TransformC,
  type ColliderC,
  type HealthC,
  type ProjectileC,
  type EnemyC,
} from '../components/index.ts';
import type { GameState } from '../game/GameState.ts';
import { INVINCIBLE_DURATION, HIT_FLASH_DURATION } from '../game/constants.ts';
import { SFX } from '../sfx.ts';
import type { DamageNumbers } from '../ui/DamageNumbers.ts';
import type { ExplosionFX } from '../ui/ExplosionFX.ts';

export class CollisionSystem {
  constructor(
    private world: World,
    private state: GameState,
    private damageNumbers: DamageNumbers,
    private explosionFX: ExplosionFX,
  ) {}

  update(dt: number): void {
    this.tickInvincibility(dt);
    this.playerProjectilesVsEnemies();
    this.enemyProjectilesVsPlayers();
    this.enemyContactVsPlayers();
  }

  private tickInvincibility(dt: number): void {
    for (const ps of this.state.players) {
      if (!ps.alive) continue;
      const hp = this.world.get<HealthC>(ps.entityId, C.Health);
      if (hp && hp.invincibleTimer > 0) {
        hp.invincibleTimer -= dt;
      }
    }
  }

  /** Player bullets → enemies (including boss). */
  private playerProjectilesVsEnemies(): void {
    const projectiles = this.world.query(C.Transform, C.Collider, C.Projectile);
    const enemies = this.world.query(C.Transform, C.Collider, C.Health, C.Enemy);

    for (const pEnt of projectiles) {
      const pCol = this.world.get<ColliderC>(pEnt, C.Collider)!;
      if (pCol.layer !== 'playerProjectile') continue;
      const pT = this.world.get<TransformC>(pEnt, C.Transform)!;
      const pProj = this.world.get<ProjectileC>(pEnt, C.Projectile)!;

      for (const eEnt of enemies) {
        const eT = this.world.get<TransformC>(eEnt, C.Transform)!;
        const eCol = this.world.get<ColliderC>(eEnt, C.Collider)!;

        const dx = pT.x - eT.x;
        const dy = pT.y - eT.y;
        const distSq = dx * dx + dy * dy;
        const minDist = pCol.radius + eCol.radius;

        if (distSq < minDist * minDist) {
          const explosionRadius = pProj.explosionRadius ?? 0;

          if (explosionRadius > 0) {
            // ── Explosive projectile: AOE damage ──────────────
            this.detonateExplosion(pT.x, pT.y, pProj.damage, explosionRadius, pProj.explosionColor ?? 0xff4400, eEnt, enemies);
          } else {
            // ── Normal projectile: single-target damage ───────
            const eHp = this.world.get<HealthC>(eEnt, C.Health)!;
            eHp.current -= pProj.damage;
            eHp.flashTimer = HIT_FLASH_DURATION;

            // Knockback
            const vel = this.world.get(eEnt, C.Velocity) as { vx: number; vy: number } | undefined;
            if (vel) {
              const dist = Math.sqrt(distSq) || 1;
              vel.vx += (dx / dist) * 80;
              vel.vy += (dy / dist) * 80;
            }

            this.damageNumbers.spawn(eT.x, eT.y, pProj.damage);
            SFX.hit();
          }

          // Destroy projectile
          this.world.markDestroy(pEnt);
          break; // This projectile is done
        }
      }
    }
  }

  /** Deal AOE damage at an impact point. Direct-hit enemy gets full damage; others in radius get 50%. */
  private detonateExplosion(
    impactX: number,
    impactY: number,
    damage: number,
    radius: number,
    color: number,
    directHitEntity: number,
    enemies: number[],
  ): void {
    const splashDamage = Math.max(1, Math.round(damage * 0.5));
    const radiusSq = radius * radius;

    for (const eEnt of enemies) {
      const eT = this.world.get<TransformC>(eEnt, C.Transform)!;
      const eHp = this.world.get<HealthC>(eEnt, C.Health);
      if (!eHp) continue;

      const dx = impactX - eT.x;
      const dy = impactY - eT.y;
      const distSq = dx * dx + dy * dy;

      // Direct-hit enemy: always in range (full damage)
      // Other enemies: must be within explosion radius (splash damage)
      const isDirectHit = eEnt === directHitEntity;
      if (!isDirectHit && distSq > radiusSq) continue;

      const dmg = isDirectHit ? damage : splashDamage;
      eHp.current -= dmg;
      eHp.flashTimer = HIT_FLASH_DURATION;

      // Knockback away from explosion center
      const vel = this.world.get(eEnt, C.Velocity) as { vx: number; vy: number } | undefined;
      if (vel) {
        const dist = Math.sqrt(distSq) || 1;
        const knockStrength = isDirectHit ? 120 : 80;
        vel.vx -= (dx / dist) * knockStrength;
        vel.vy -= (dy / dist) * knockStrength;
      }

      this.damageNumbers.spawn(eT.x, eT.y, dmg);
    }

    // Explosion visual + sound
    this.explosionFX.spawn(impactX, impactY, radius, color);
    SFX.explosion();
  }

  /** Enemy bullets → all alive players. */
  private enemyProjectilesVsPlayers(): void {
    const projectiles = this.world.query(C.Transform, C.Collider, C.Projectile);

    for (const pEnt of projectiles) {
      const pCol = this.world.get<ColliderC>(pEnt, C.Collider)!;
      if (pCol.layer !== 'enemyProjectile') continue;
      const pT = this.world.get<TransformC>(pEnt, C.Transform)!;
      const pProj = this.world.get<ProjectileC>(pEnt, C.Projectile)!;

      let hit = false;
      for (const ps of this.state.players) {
        if (!ps.alive) continue;
        const playerT = this.world.get<TransformC>(ps.entityId, C.Transform);
        const playerCol = this.world.get<ColliderC>(ps.entityId, C.Collider);
        const playerHp = this.world.get<HealthC>(ps.entityId, C.Health);
        if (!playerT || !playerCol || !playerHp || playerHp.invincibleTimer > 0) continue;

        const dx = pT.x - playerT.x;
        const dy = pT.y - playerT.y;
        const distSq = dx * dx + dy * dy;
        const minDist = pCol.radius + playerCol.radius;

        if (distSq < minDist * minDist) {
          playerHp.current -= pProj.damage;
          playerHp.invincibleTimer = INVINCIBLE_DURATION;
          playerHp.flashTimer = HIT_FLASH_DURATION;
          SFX.playerHit();
          this.damageNumbers.spawn(playerT.x, playerT.y - 20, pProj.damage, true);
          this.world.markDestroy(pEnt);
          hit = true;
          break;
        }
      }
      if (hit) continue;
    }
  }

  /** Enemy contact → all alive players. */
  private enemyContactVsPlayers(): void {
    const enemies = this.world.query(C.Transform, C.Collider, C.Enemy);

    for (const eEnt of enemies) {
      const eT = this.world.get<TransformC>(eEnt, C.Transform)!;
      const eCol = this.world.get<ColliderC>(eEnt, C.Collider)!;
      const enemy = this.world.get<EnemyC>(eEnt, C.Enemy)!;

      for (const ps of this.state.players) {
        if (!ps.alive) continue;
        const playerT = this.world.get<TransformC>(ps.entityId, C.Transform);
        const playerCol = this.world.get<ColliderC>(ps.entityId, C.Collider);
        const playerHp = this.world.get<HealthC>(ps.entityId, C.Health);
        if (!playerT || !playerCol || !playerHp || playerHp.invincibleTimer > 0) continue;

        const dx = eT.x - playerT.x;
        const dy = eT.y - playerT.y;
        const distSq = dx * dx + dy * dy;
        const minDist = eCol.radius + playerCol.radius;

        if (distSq < minDist * minDist) {
          playerHp.current -= enemy.contactDamage;
          playerHp.invincibleTimer = INVINCIBLE_DURATION;
          playerHp.flashTimer = HIT_FLASH_DURATION;
          SFX.playerHit();
          this.damageNumbers.spawn(playerT.x, playerT.y - 20, enemy.contactDamage, true);

          // Push player away
          const dist = Math.sqrt(distSq) || 1;
          const vel = this.world.get(ps.entityId, C.Velocity) as
            | { vx: number; vy: number }
            | undefined;
          if (vel) {
            vel.vx -= (dx / dist) * 150;
            vel.vy -= (dy / dist) * 150;
          }
          break; // one contact per enemy per frame
        }
      }
    }
  }
}
