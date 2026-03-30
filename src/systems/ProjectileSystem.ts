import { World } from '../engine/World.ts';
import { C, type ProjectileC, type TransformC, type ColliderC } from '../components/index.ts';
import { ARENA_WIDTH, ARENA_HEIGHT } from '../game/constants.ts';
import { getWallRects, circleHitsWall } from '../game/wallCollision.ts';

export class ProjectileSystem {
  update(world: World, dt: number): void {
    const walls = getWallRects(world);

    for (const entity of world.query(C.Projectile, C.Transform)) {
      const proj = world.get<ProjectileC>(entity, C.Projectile)!;
      const t = world.get<TransformC>(entity, C.Transform)!;

      proj.lifetime -= dt;

      // Destroy if expired or out of arena
      if (
        proj.lifetime <= 0 ||
        t.x < -50 ||
        t.x > ARENA_WIDTH + 50 ||
        t.y < -50 ||
        t.y > ARENA_HEIGHT + 50
      ) {
        world.markDestroy(entity);
        continue;
      }

      // Destroy if hitting a wall
      const col = world.get<ColliderC>(entity, C.Collider);
      const radius = col ? col.radius : 4;
      if (circleHitsWall(t.x, t.y, radius, walls)) {
        world.markDestroy(entity);
      }
    }
  }
}
