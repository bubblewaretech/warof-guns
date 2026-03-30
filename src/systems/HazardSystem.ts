import { World } from '../engine/World.ts';
import {
  C,
  type TransformC,
  type ColliderC,
  type HealthC,
  type SpikeC,
} from '../components/index.ts';
import type { GameState } from '../game/GameState.ts';
import { HIT_FLASH_DURATION, INVINCIBLE_DURATION } from '../game/constants.ts';
import { SFX } from '../sfx.ts';
import type { DamageNumbers } from '../ui/DamageNumbers.ts';

/**
 * Damages any entity (player or enemy) standing on spikes.
 * Uses per-entity cooldown timers to avoid rapid re-damage.
 */
export class HazardSystem {
  constructor(
    private world: World,
    private state: GameState,
    private damageNumbers: DamageNumbers,
  ) {}

  update(dt: number): void {
    const spikes = this.world.query(C.Spike, C.Transform);

    // Check all alive players vs spikes
    for (const ps of this.state.players) {
      if (!ps.alive) continue;
      this.checkEntityVsSpikes(ps.entityId, spikes, dt, true);
    }

    // Check enemies vs spikes
    for (const enemy of this.world.query(C.Enemy, C.Transform, C.Health)) {
      this.checkEntityVsSpikes(enemy, spikes, dt, false);
    }

    // Also check boss vs spikes
    for (const boss of this.world.query(C.Boss, C.Transform, C.Health)) {
      this.checkEntityVsSpikes(boss, spikes, dt, false);
    }
  }

  private checkEntityVsSpikes(
    entity: number,
    spikeEntities: number[],
    dt: number,
    isPlayer: boolean,
  ): void {
    const t = this.world.get<TransformC>(entity, C.Transform);
    const col = this.world.get<ColliderC>(entity, C.Collider);
    const hp = this.world.get<HealthC>(entity, C.Health);
    if (!t || !col || !hp) return;

    // Player has invincibility window
    if (isPlayer && hp.invincibleTimer > 0) return;

    for (const sEnt of spikeEntities) {
      const spike = this.world.get<SpikeC>(sEnt, C.Spike)!;
      const sT = this.world.get<TransformC>(sEnt, C.Transform)!;

      // Circle vs AABB overlap check
      const halfW = spike.width / 2;
      const halfH = spike.height / 2;
      const sCx = sT.x + halfW;
      const sCy = sT.y + halfH;

      // Closest point on AABB to circle center
      const closestX = Math.max(sT.x, Math.min(t.x, sT.x + spike.width));
      const closestY = Math.max(sT.y, Math.min(t.y, sT.y + spike.height));

      const dx = t.x - closestX;
      const dy = t.y - closestY;
      const distSq = dx * dx + dy * dy;

      if (distSq < col.radius * col.radius) {
        // Entity is overlapping spike — check cooldown
        const lastHit = spike.lastHitTimers.get(entity) ?? -999;
        const elapsed = spike.damageCooldown - lastHit; // we store remaining cooldown

        // Update all timers
        let timer = spike.lastHitTimers.get(entity);
        if (timer !== undefined) {
          timer -= dt;
          spike.lastHitTimers.set(entity, timer);
          if (timer > 0) continue; // still on cooldown
        }

        // Apply damage
        hp.current -= spike.damage;
        hp.flashTimer = HIT_FLASH_DURATION;
        spike.lastHitTimers.set(entity, spike.damageCooldown);

        if (isPlayer) {
          hp.invincibleTimer = INVINCIBLE_DURATION;
          SFX.playerHit();
          this.damageNumbers.spawn(t.x, t.y - 20, spike.damage, true);
        } else {
          this.damageNumbers.spawn(t.x, t.y - 10, spike.damage);
        }
      }
    }
  }

  /** Tick down all spike cooldown timers. Call once per frame. */
  tickCooldowns(dt: number): void {
    for (const sEnt of this.world.query(C.Spike)) {
      const spike = this.world.get<SpikeC>(sEnt, C.Spike)!;
      for (const [entity, timer] of spike.lastHitTimers) {
        if (timer > 0) {
          spike.lastHitTimers.set(entity, timer - dt);
        }
      }
    }
  }
}
