import { Container } from 'pixi.js';
import { World } from '../engine/World.ts';
import { Vec2 } from '../engine/Vec2.ts';
import {
  C,
  type TransformC,
  type VelocityC,
  type EnemyC,
  type ColliderC,
} from '../components/index.ts';
import type { GameState } from '../game/GameState.ts';
import { createProjectile } from '../game/spawner.ts';
import { getWallRects, resolveCircleVsAABB } from '../game/wallCollision.ts';

export class EnemyAISystem {
  constructor(
    private world: World,
    private state: GameState,
    private gameLayer: Container,
  ) {}

  update(dt: number): void {
    // Collect alive player positions
    const playerPositions: Vec2[] = [];
    for (const ps of this.state.players) {
      if (!ps.alive) continue;
      const pt = this.world.get<TransformC>(ps.entityId, C.Transform);
      if (pt) playerPositions.push(new Vec2(pt.x, pt.y));
    }
    if (playerPositions.length === 0) return;

    const walls = getWallRects(this.world);

    for (const entity of this.world.query(C.Transform, C.Velocity, C.Enemy)) {
      // Skip boss entities — they have their own AI
      if (this.world.has(entity, C.Boss)) continue;

      const t = this.world.get<TransformC>(entity, C.Transform)!;
      const v = this.world.get<VelocityC>(entity, C.Velocity)!;
      const enemy = this.world.get<EnemyC>(entity, C.Enemy)!;
      const col = this.world.get<ColliderC>(entity, C.Collider);
      const pos = new Vec2(t.x, t.y);

      // Find nearest alive player
      const playerPos = this.nearestPlayer(pos, playerPositions);
      const toPlayer = playerPos.sub(pos);
      const dist = toPlayer.length();

      let moveX = 0;
      let moveY = 0;

      if (enemy.enemyType === 'melee') {
        // Rush toward player
        if (dist > 5) {
          const dir = toPlayer.normalize();
          moveX = dir.x * v.maxSpeed;
          moveY = dir.y * v.maxSpeed;
        }
        // Face player
        t.rotation = Math.atan2(toPlayer.y, toPlayer.x);
      } else {
        // Ranged: maintain preferred distance
        const preferred = enemy.preferredDistance;
        if (dist < preferred * 0.7) {
          // Too close – back away
          const away = toPlayer.normalize().scale(-1);
          moveX = away.x * v.maxSpeed;
          moveY = away.y * v.maxSpeed;
        } else if (dist > preferred * 1.3) {
          // Too far – approach
          const dir = toPlayer.normalize();
          moveX = dir.x * v.maxSpeed;
          moveY = dir.y * v.maxSpeed;
        } else {
          // In sweet spot – strafe slightly
          const perp = new Vec2(-toPlayer.y, toPlayer.x).normalize();
          moveX = perp.x * v.maxSpeed * 0.4;
          moveY = perp.y * v.maxSpeed * 0.4;
        }

        // Face player
        t.rotation = Math.atan2(toPlayer.y, toPlayer.x);

        // Shoot
        enemy.shootTimer -= dt;
        if (enemy.shootTimer <= 0 && dist < 500) {
          enemy.shootTimer = enemy.shootCooldown;
          const dir = toPlayer.normalize();
          createProjectile(
            this.world,
            this.gameLayer,
            t.x + dir.x * 16,
            t.y + dir.y * 16,
            dir.x * enemy.projectileSpeed,
            dir.y * enemy.projectileSpeed,
            enemy.projectileDamage,
            'enemy',
          );
        }
      }

      // Simple wall avoidance: check if moving in this direction would hit a wall
      if (col && walls.length > 0) {
        const lookAhead = 30;
        const futureX = t.x + (moveX > 0 ? 1 : moveX < 0 ? -1 : 0) * lookAhead;
        const futureY = t.y + (moveY > 0 ? 1 : moveY < 0 ? -1 : 0) * lookAhead;

        for (const wall of walls) {
          const hit = resolveCircleVsAABB(futureX, futureY, col.radius + 5, wall);
          if (hit) {
            // Steer perpendicular to wall normal
            const wallCx = wall.x + wall.w / 2;
            const wallCy = wall.y + wall.h / 2;
            const dx = t.x - wallCx;
            const dy = t.y - wallCy;
            if (Math.abs(dx) > Math.abs(dy)) {
              moveX = dx > 0 ? v.maxSpeed * 0.6 : -v.maxSpeed * 0.6;
            } else {
              moveY = dy > 0 ? v.maxSpeed * 0.6 : -v.maxSpeed * 0.6;
            }
            break;
          }
        }
      }

      v.vx = moveX;
      v.vy = moveY;
    }
  }

  /** Find closest player position to an enemy. */
  private nearestPlayer(enemyPos: Vec2, playerPositions: Vec2[]): Vec2 {
    let best = playerPositions[0];
    let bestDistSq = Infinity;
    for (const pp of playerPositions) {
      const dx = pp.x - enemyPos.x;
      const dy = pp.y - enemyPos.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        best = pp;
      }
    }
    return best;
  }
}
