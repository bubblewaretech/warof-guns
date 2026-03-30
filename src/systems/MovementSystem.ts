import { World } from '../engine/World.ts';
import { C, type TransformC, type VelocityC, type ColliderC } from '../components/index.ts';
import { ARENA_WIDTH, ARENA_HEIGHT } from '../game/constants.ts';
import { getWallRects, resolveCircleVsAABB } from '../game/wallCollision.ts';

export class MovementSystem {
  update(world: World, dt: number): void {
    // Cache wall rects once per frame
    const walls = getWallRects(world);

    for (const entity of world.query(C.Transform, C.Velocity)) {
      const t = world.get<TransformC>(entity, C.Transform)!;
      const v = world.get<VelocityC>(entity, C.Velocity)!;

      // Apply friction (exponential decay)
      if (v.friction > 0) {
        const decay = Math.exp(-v.friction * dt);
        v.vx *= decay;
        v.vy *= decay;
      }

      // Clamp to max speed
      const speedSq = v.vx * v.vx + v.vy * v.vy;
      if (speedSq > v.maxSpeed * v.maxSpeed) {
        const speed = Math.sqrt(speedSq);
        v.vx = (v.vx / speed) * v.maxSpeed;
        v.vy = (v.vy / speed) * v.maxSpeed;
      }

      // Integrate position
      t.x += v.vx * dt;
      t.y += v.vy * dt;

      // Clamp to arena bounds (only for non-projectile entities with friction)
      if (v.friction > 0) {
        const margin = 10;
        t.x = Math.max(margin, Math.min(ARENA_WIDTH - margin, t.x));
        t.y = Math.max(margin, Math.min(ARENA_HEIGHT - margin, t.y));

        // Wall collision: push circle entities out of wall AABBs
        const col = world.get<ColliderC>(entity, C.Collider);
        if (col) {
          for (const wall of walls) {
            const resolved = resolveCircleVsAABB(t.x, t.y, col.radius, wall);
            if (resolved) {
              t.x = resolved.x;
              t.y = resolved.y;
              // Kill velocity component in the collision direction
              const wallCx = wall.x + wall.w / 2;
              const wallCy = wall.y + wall.h / 2;
              const dx = t.x - wallCx;
              const dy = t.y - wallCy;
              if (Math.abs(dx) > Math.abs(dy)) {
                v.vx = 0;
              } else {
                v.vy = 0;
              }
            }
          }
        }
      }
    }
  }
}
