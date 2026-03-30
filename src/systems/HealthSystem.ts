import { World } from '../engine/World.ts';
import { C, type HealthC, type EnemyC, type SpriteC, type ColliderC } from '../components/index.ts';
import type { GameState } from '../game/GameState.ts';
import { xpForLevel, checkLevelUp } from '../game/rules.ts';
import { SFX } from '../sfx.ts';

export class HealthSystem {
  update(world: World, state: GameState, dt: number): void {
    // Flash timers
    for (const entity of world.query(C.Health)) {
      const hp = world.get<HealthC>(entity, C.Health)!;
      if (hp.flashTimer > 0) hp.flashTimer -= dt;
    }

    // Check enemy deaths — award XP/money to ALL alive players
    for (const entity of world.query(C.Health, C.Enemy)) {
      const hp = world.get<HealthC>(entity, C.Health)!;
      if (hp.current <= 0) {
        const enemy = world.get<EnemyC>(entity, C.Enemy)!;

        // Track run stats for achievements
        state.runStats.killsThisRun++;
        state.runStats.moneyEarned += enemy.moneyValue;

        for (const ps of state.players) {
          if (!ps.alive) continue;

          ps.xp += enemy.xpValue;
          ps.money += enemy.moneyValue;

          // Check level-up per player
          const newLevels = checkLevelUp(ps.xp, ps.level);
          if (newLevels > 0) {
            ps.level += newLevels;
            ps.xpToNextLevel = xpForLevel(ps.level + 1);
            ps.pendingLevelUps += newLevels;
            SFX.levelUp();
          }
        }

        SFX.enemyDie();
        world.markDestroy(entity);
      }
    }

    // Check player deaths — game over only when ALL dead
    let allDead = true;
    for (const ps of state.players) {
      if (!ps.alive) continue;
      const playerHp = world.get<HealthC>(ps.entityId, C.Health);
      if (playerHp && playerHp.current <= 0) {
        ps.alive = false;
        // Hide sprite but don't destroy entity (for revive at wave end)
        const sprite = world.get<SpriteC>(ps.entityId, C.Sprite);
        if (sprite) sprite.gfx.visible = false;
        // Remove collider so enemies/projectiles ignore the corpse
        world.remove(ps.entityId, C.Collider);
        SFX.playerHit();
      }
      if (ps.alive) allDead = false;
    }

    if (allDead) {
      state.phase = 'gameover';
    }
  }
}
