import { Graphics } from 'pixi.js';
import { World } from '../engine/World.ts';
import {
  C,
  type TransformC,
  type SpriteC,
  type HealthC,
  type PlayerC,
} from '../components/index.ts';
import type { GameState } from '../game/GameState.ts';
import { COLORS, MELEE_SWING_VISUAL_DURATION } from '../game/constants.ts';
import { getMeleeStats } from '../game/rules.ts';
import type { WeaponsData } from '../data/types.ts';

export class RenderSystem {
  private swingGfx: Graphics;

  constructor(
    private world: World,
    private state: GameState,
    private weapons: WeaponsData,
    swingContainer: { addChild: (g: Graphics) => void },
  ) {
    this.swingGfx = new Graphics();
    swingContainer.addChild(this.swingGfx);
  }

  update(_dt: number): void {
    // Sync sprite positions with transforms
    for (const entity of this.world.query(C.Transform, C.Sprite)) {
      const t = this.world.get<TransformC>(entity, C.Transform)!;
      const s = this.world.get<SpriteC>(entity, C.Sprite)!;

      s.gfx.position.set(t.x, t.y);

      // Rotate player to aim direction
      if (this.world.has(entity, C.Player)) {
        const p = this.world.get<PlayerC>(entity, C.Player)!;
        s.gfx.rotation = p.aimAngle;
      }

      // Flash effect on hit
      const hp = this.world.get<HealthC>(entity, C.Health);
      if (hp && hp.flashTimer > 0) {
        s.gfx.tint = 0xffffff;
        s.gfx.alpha = 0.7;
      } else {
        s.gfx.tint = 0xffffff;
        s.gfx.alpha = 1;
      }

      // Player invincibility blink (works for any player entity)
      if (this.world.has(entity, C.Player) && hp && hp.invincibleTimer > 0) {
        s.gfx.alpha = Math.sin(hp.invincibleTimer * 20) > 0 ? 1 : 0.3;
      }
    }

    // Melee swing visual — draw for each alive player with active swing
    this.swingGfx.clear();
    for (const ps of this.state.players) {
      if (!ps.alive || ps.meleeSwingTimer <= 0) continue;

      const t = this.world.get<TransformC>(ps.entityId, C.Transform);
      if (!t) continue;

      const stats = getMeleeStats(ps.melee.id, ps.melee.level, this.weapons);
      const arcRad = (stats.arc * Math.PI) / 180;
      const startAngle = ps.meleeSwingAngle - arcRad / 2;
      const endAngle = ps.meleeSwingAngle + arcRad / 2;
      const alpha = ps.meleeSwingTimer / MELEE_SWING_VISUAL_DURATION;

      this.swingGfx.beginFill(COLORS.meleeSwing, alpha * 0.4);
      this.swingGfx.moveTo(t.x, t.y);
      this.swingGfx.arc(t.x, t.y, stats.range + 20, startAngle, endAngle);
      this.swingGfx.lineTo(t.x, t.y);
      this.swingGfx.endFill();

      this.swingGfx.lineStyle(2, COLORS.meleeSwing, alpha * 0.8);
      this.swingGfx.arc(t.x, t.y, stats.range + 20, startAngle, endAngle);
    }
  }
}
