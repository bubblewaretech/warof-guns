import { ARENA_WIDTH, ARENA_HEIGHT } from './constants.ts';
import type { ObstacleRect } from '../data/types.ts';

export interface ArenaObstacles {
  walls: ObstacleRect[];
  spikes: ObstacleRect[];
}

const WALL_MARGIN = 100;   // min distance from arena edge
const PLAYER_SAFE = 200;   // keep center clear for player spawn
const MIN_GAP = 60;        // minimum gap between obstacles

/**
 * Generate a deterministic-looking but randomised layout of walls and spikes for a given wave.
 * Earlier waves have fewer / no obstacles; later waves ramp up.
 */
export function generateArenaLayout(wave: number): ArenaObstacles {
  const walls: ObstacleRect[] = [];
  const spikes: ObstacleRect[] = [];

  // Waves 1-2: no obstacles (let player learn)
  if (wave <= 2) return { walls, spikes };

  // Seed-like randomness based on wave to get variety
  let seed = wave * 7919;
  function rand(): number {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed & 0x7fffffff) / 0x7fffffff;
  }

  // Number of obstacles scales with wave
  const numWalls = Math.min(Math.floor((wave - 2) * 0.8), 8);
  const numSpikes = Math.min(Math.floor((wave - 2) * 0.6), 6);

  const cx = ARENA_WIDTH / 2;
  const cy = ARENA_HEIGHT / 2;

  const placed: ObstacleRect[] = [];

  function overlapsExisting(rect: ObstacleRect): boolean {
    // Check player safe zone
    if (
      rect.x + rect.w > cx - PLAYER_SAFE &&
      rect.x < cx + PLAYER_SAFE &&
      rect.y + rect.h > cy - PLAYER_SAFE &&
      rect.y < cy + PLAYER_SAFE
    ) {
      return true;
    }
    // Check against other placed obstacles
    for (const p of placed) {
      if (
        rect.x < p.x + p.w + MIN_GAP &&
        rect.x + rect.w > p.x - MIN_GAP &&
        rect.y < p.y + p.h + MIN_GAP &&
        rect.y + rect.h > p.y - MIN_GAP
      ) {
        return true;
      }
    }
    return false;
  }

  function tryPlace(isWall: boolean): ObstacleRect | null {
    for (let attempt = 0; attempt < 20; attempt++) {
      const w = isWall
        ? 60 + Math.floor(rand() * 120) // walls: 60-180 wide
        : 40 + Math.floor(rand() * 60);  // spikes: 40-100 wide
      const h = isWall
        ? 20 + Math.floor(rand() * 40)   // walls: 20-60 tall
        : 30 + Math.floor(rand() * 40);  // spikes: 30-70 tall

      const x = WALL_MARGIN + Math.floor(rand() * (ARENA_WIDTH - 2 * WALL_MARGIN - w));
      const y = WALL_MARGIN + Math.floor(rand() * (ARENA_HEIGHT - 2 * WALL_MARGIN - h));

      const rect: ObstacleRect = { x, y, w, h };
      if (!overlapsExisting(rect)) {
        placed.push(rect);
        return rect;
      }
    }
    return null;
  }

  // Place walls first
  for (let i = 0; i < numWalls; i++) {
    const w = tryPlace(true);
    if (w) walls.push(w);
  }

  // Then spikes
  for (let i = 0; i < numSpikes; i++) {
    const s = tryPlace(false);
    if (s) spikes.push(s);
  }

  return { walls, spikes };
}
