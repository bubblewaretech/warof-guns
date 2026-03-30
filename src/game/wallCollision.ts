import { World } from '../engine/World.ts';
import { C, type TransformC, type WallC, type ColliderC } from '../components/index.ts';

export interface WallRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Returns all wall rectangles from the ECS world.
 * Cached per-frame if needed.
 */
export function getWallRects(world: World): WallRect[] {
  const rects: WallRect[] = [];
  for (const entity of world.query(C.Wall, C.Transform)) {
    const t = world.get<TransformC>(entity, C.Transform)!;
    const w = world.get<WallC>(entity, C.Wall)!;
    rects.push({ x: t.x, y: t.y, w: w.width, h: w.height });
  }
  return rects;
}

/**
 * Resolve a circle (position + radius) against a wall AABB.
 * Returns the pushed-out position if overlapping, or null if no collision.
 */
export function resolveCircleVsAABB(
  cx: number,
  cy: number,
  radius: number,
  rect: WallRect,
): { x: number; y: number } | null {
  // Closest point on AABB to circle center
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));

  const dx = cx - closestX;
  const dy = cy - closestY;
  const distSq = dx * dx + dy * dy;

  if (distSq >= radius * radius) return null;

  // Overlap! Push circle out
  const dist = Math.sqrt(distSq);
  if (dist < 0.001) {
    // Circle center is inside AABB — push to nearest edge
    const toLeft = cx - rect.x;
    const toRight = rect.x + rect.w - cx;
    const toTop = cy - rect.y;
    const toBottom = rect.y + rect.h - cy;
    const minDist = Math.min(toLeft, toRight, toTop, toBottom);

    if (minDist === toLeft) return { x: rect.x - radius, y: cy };
    if (minDist === toRight) return { x: rect.x + rect.w + radius, y: cy };
    if (minDist === toTop) return { x: cx, y: rect.y - radius };
    return { x: cx, y: rect.y + rect.h + radius };
  }

  const overlap = radius - dist;
  const nx = dx / dist;
  const ny = dy / dist;
  return { x: cx + nx * overlap, y: cy + ny * overlap };
}

/**
 * Check if a point is inside any wall AABB.
 */
export function pointInWall(
  px: number,
  py: number,
  walls: WallRect[],
): boolean {
  for (const w of walls) {
    if (px >= w.x && px <= w.x + w.w && py >= w.y && py <= w.y + w.h) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a circle overlaps any wall AABB.
 */
export function circleHitsWall(
  cx: number,
  cy: number,
  radius: number,
  walls: WallRect[],
): boolean {
  for (const w of walls) {
    const closestX = Math.max(w.x, Math.min(cx, w.x + w.w));
    const closestY = Math.max(w.y, Math.min(cy, w.y + w.h));
    const dx = cx - closestX;
    const dy = cy - closestY;
    if (dx * dx + dy * dy < radius * radius) return true;
  }
  return false;
}
