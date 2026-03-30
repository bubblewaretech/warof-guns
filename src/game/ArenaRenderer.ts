import { Graphics } from 'pixi.js';
import { ARENA_WIDTH, ARENA_HEIGHT, COLORS } from './constants.ts';
import type { ArenaObstacles } from './ArenaLayout.ts';

/**
 * Draws the dungeon-style background, walls and spike visuals.
 * All drawing is done into one Graphics object for performance.
 */
export function drawDungeonBackground(g: Graphics): void {
  g.clear();

  // ── Base floor ──
  g.beginFill(COLORS.dungeonFloor1);
  g.drawRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
  g.endFill();

  // ── Stone tile pattern (varied rectangles, not a grid) ──
  const tileSize = 64;
  let seed = 42;
  function rand(): number {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed & 0x7fffffff) / 0x7fffffff;
  }

  for (let tx = 0; tx < ARENA_WIDTH; tx += tileSize) {
    for (let ty = 0; ty < ARENA_HEIGHT; ty += tileSize) {
      // Each tile gets a slightly different shade
      const shade = rand();
      let color: number;
      if (shade < 0.4) {
        color = COLORS.dungeonFloor2;
      } else if (shade < 0.75) {
        color = COLORS.dungeonFloor1;
      } else {
        color = COLORS.dungeonFloor3;
      }

      g.beginFill(color);
      g.drawRect(tx, ty, tileSize, tileSize);
      g.endFill();

      // Subtle crack lines on some tiles
      if (rand() < 0.2) {
        g.lineStyle(1, 0x181828, 0.5);
        const cx = tx + rand() * tileSize * 0.8;
        const cy = ty + rand() * tileSize * 0.8;
        g.moveTo(cx, cy);
        g.lineTo(cx + 10 + rand() * 20, cy + 5 + rand() * 15);
      }
    }
  }

  // ── Tile grout lines ──
  g.lineStyle(1, 0x15152a, 0.6);
  for (let x = 0; x <= ARENA_WIDTH; x += tileSize) {
    // Slightly offset each line for organic feel
    const jitter = (x * 13) % 3 - 1;
    g.moveTo(x + jitter, 0);
    g.lineTo(x + jitter, ARENA_HEIGHT);
  }
  for (let y = 0; y <= ARENA_HEIGHT; y += tileSize) {
    const jitter = (y * 17) % 3 - 1;
    g.moveTo(0, y + jitter);
    g.lineTo(ARENA_WIDTH, y + jitter);
  }

  // ── Border walls ──
  g.lineStyle(6, COLORS.dungeonWallTop);
  g.drawRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
  // Inner border shadow
  g.lineStyle(2, 0x333355);
  g.drawRect(3, 3, ARENA_WIDTH - 6, ARENA_HEIGHT - 6);
}

/** Draw wall and spike obstacles on top of background. */
export function drawObstacles(g: Graphics, obstacles: ArenaObstacles): void {
  // Walls — stone blocks with top highlight
  for (const w of obstacles.walls) {
    // Shadow
    g.beginFill(0x222244, 0.5);
    g.drawRect(w.x + 3, w.y + 3, w.w, w.h);
    g.endFill();

    // Main body
    g.beginFill(COLORS.dungeonWall);
    g.drawRect(w.x, w.y, w.w, w.h);
    g.endFill();

    // Top edge highlight
    g.lineStyle(2, COLORS.dungeonWallTop);
    g.moveTo(w.x, w.y);
    g.lineTo(w.x + w.w, w.y);

    // Inner lines for brick texture
    g.lineStyle(1, 0x444466, 0.5);
    const brickH = 12;
    for (let by = w.y + brickH; by < w.y + w.h; by += brickH) {
      g.moveTo(w.x + 2, by);
      g.lineTo(w.x + w.w - 2, by);
    }
  }

  // Spikes — red/dark floor traps with triangular spikes
  for (const s of obstacles.spikes) {
    // Base pit
    g.beginFill(0x331111);
    g.drawRect(s.x, s.y, s.w, s.h);
    g.endFill();

    // Draw spike triangles across the area
    const spikeSpacing = 14;
    g.beginFill(COLORS.dungeonSpike);
    for (let sx = s.x + 7; sx < s.x + s.w - 4; sx += spikeSpacing) {
      for (let sy = s.y + 7; sy < s.y + s.h - 4; sy += spikeSpacing) {
        g.moveTo(sx, sy - 5);
        g.lineTo(sx + 4, sy + 4);
        g.lineTo(sx - 4, sy + 4);
        g.closePath();
      }
    }
    g.endFill();

    // Highlight tips
    g.beginFill(COLORS.dungeonSpikeShine, 0.6);
    for (let sx = s.x + 7; sx < s.x + s.w - 4; sx += spikeSpacing) {
      for (let sy = s.y + 7; sy < s.y + s.h - 4; sy += spikeSpacing) {
        g.drawCircle(sx, sy - 4, 1.5);
      }
    }
    g.endFill();

    // Border
    g.lineStyle(1, COLORS.dungeonSpike, 0.7);
    g.drawRect(s.x, s.y, s.w, s.h);
  }
}
