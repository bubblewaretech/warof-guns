import { Graphics, Text, TextStyle, Container } from 'pixi.js';
import { World } from '../engine/World.ts';
import { C, type HealthC, type BossC } from '../components/index.ts';
import type { GameState } from '../game/GameState.ts';
import { CANVAS_WIDTH, COLORS } from '../game/constants.ts';

const BAR_WIDTH = 400;
const BAR_HEIGHT = 20;
const BAR_Y = 30;

export class BossHealthBar {
  private container: Container;
  private barBg: Graphics;
  private barFill: Graphics;
  private nameText: Text;
  private visible = false;

  constructor(private uiContainer: Container) {
    this.container = new Container();

    // Background bar
    this.barBg = new Graphics();
    this.barBg.beginFill(COLORS.bossBarBg);
    this.barBg.drawRoundedRect(0, 0, BAR_WIDTH, BAR_HEIGHT, 4);
    this.barBg.endFill();
    this.barBg.lineStyle(2, 0x888888);
    this.barBg.drawRoundedRect(0, 0, BAR_WIDTH, BAR_HEIGHT, 4);

    // Fill bar
    this.barFill = new Graphics();

    // Name label
    this.nameText = new Text('BOSS', new TextStyle({
      fontFamily: 'monospace',
      fontSize: 14,
      fontWeight: 'bold',
      fill: '#ff4444',
      stroke: '#000000',
      strokeThickness: 3,
    }));

    this.container.addChild(this.barBg);
    this.container.addChild(this.barFill);
    this.container.addChild(this.nameText);

    // Center horizontally
    this.container.x = (CANVAS_WIDTH - BAR_WIDTH) / 2;
    this.container.y = BAR_Y;
    this.nameText.x = BAR_WIDTH / 2 - this.nameText.width / 2;
    this.nameText.y = -18;

    this.container.visible = false;
    uiContainer.addChild(this.container);
  }

  show(): void {
    this.visible = true;
    this.container.visible = true;
  }

  hide(): void {
    this.visible = false;
    this.container.visible = false;
  }

  update(world: World, state: GameState): void {
    if (!this.visible || state.bossId < 0) {
      this.container.visible = false;
      return;
    }

    const hp = world.get<HealthC>(state.bossId, C.Health);
    if (!hp) {
      this.hide();
      return;
    }

    if (hp.current <= 0) {
      this.hide();
      return;
    }

    this.container.visible = true;

    // Update boss name dynamically
    const displayName = (state.bossName || 'BOSS').toUpperCase();
    if (this.nameText.text !== displayName) {
      this.nameText.text = displayName;
      this.nameText.x = BAR_WIDTH / 2 - this.nameText.width / 2;
    }

    const pct = Math.max(0, hp.current / hp.max);

    this.barFill.clear();

    // Color shifts from red to darker red as HP drops
    const r = Math.floor(255 * Math.min(1, pct + 0.3));
    const g = Math.floor(50 * pct);
    const color = (r << 16) | (g << 8) | 0x22;

    this.barFill.beginFill(color);
    this.barFill.drawRoundedRect(0, 0, BAR_WIDTH * pct, BAR_HEIGHT, 4);
    this.barFill.endFill();

    // Flash white when recently hit
    if (hp.flashTimer > 0) {
      this.barFill.beginFill(0xffffff, 0.3);
      this.barFill.drawRoundedRect(0, 0, BAR_WIDTH * pct, BAR_HEIGHT, 4);
      this.barFill.endFill();
    }
  }

  destroy(): void {
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    this.container.destroy({ children: true });
  }
}
