import { Container, Graphics, Text } from 'pixi.js';
import type { GameState, PlayerState } from '../game/GameState.ts';
import { activeGun } from '../game/GameState.ts';
import type { WeaponsData } from '../data/types.ts';
import { getGunStats, xpForLevel } from '../game/rules.ts';
import { PLAYER_MAX_HP, COLORS, CANVAS_WIDTH } from '../game/constants.ts';
import { World } from '../engine/World.ts';
import { C, type HealthC } from '../components/index.ts';

const HUD_Y = 8;
const BAR_W = 140;
const BAR_H = 12;

const PLAYER_COLORS = [0x44ff44, 0x4488ff]; // P1 green, P2 blue
const PLAYER_LABELS = ['P1', 'P2'];

export class HUD {
  // Per-player HUD elements
  private hpBars: Graphics[] = [];
  private xpBars: Graphics[] = [];
  private labelTexts: Text[] = [];
  private levelTexts: Text[] = [];
  private moneyTexts: Text[] = [];
  private ammoTexts: Text[] = [];
  private weaponTexts: Text[] = [];
  private deadTexts: Text[] = [];

  // Shared
  private waveText: Text;
  private enemyText: Text;

  constructor(
    private layer: Container,
    private state: GameState,
    private weapons: WeaponsData,
    private world: World,
  ) {
    const textStyle = {
      fontSize: 13,
      fontFamily: 'monospace',
      fill: '#ffffff',
    };

    // Create HUD elements for each player
    const numPlayers = state.players.length;
    for (let i = 0; i < numPlayers; i++) {
      const isRight = i === 1;
      const baseX = isRight ? CANVAS_WIDTH - 10 - BAR_W : 10;
      const labelColor = PLAYER_COLORS[i];

      // Player label (P1 / P2)
      const label = new Text(PLAYER_LABELS[i], {
        ...textStyle,
        fontSize: 12,
        fill: `#${labelColor.toString(16).padStart(6, '0')}`,
      });
      label.position.set(baseX, HUD_Y - 2);
      layer.addChild(label);
      this.labelTexts.push(label);

      // HP bar
      const hpBar = new Graphics();
      hpBar.position.set(baseX + 24, HUD_Y);
      layer.addChild(hpBar);
      this.hpBars.push(hpBar);

      // XP bar
      const xpBar = new Graphics();
      xpBar.position.set(baseX + 24, HUD_Y + BAR_H + 4);
      layer.addChild(xpBar);
      this.xpBars.push(xpBar);

      // Level text
      const levelText = new Text('Lv 1', { ...textStyle, fontSize: 11 });
      levelText.position.set(baseX + 24 + BAR_W + 6, HUD_Y + BAR_H + 3);
      layer.addChild(levelText);
      this.levelTexts.push(levelText);

      // Money text
      const moneyText = new Text('$0', { ...textStyle, fontSize: 12, fill: '#ffcc00' });
      moneyText.position.set(baseX + 24, HUD_Y + BAR_H * 2 + 10);
      layer.addChild(moneyText);
      this.moneyTexts.push(moneyText);

      // Ammo text
      const ammoText = new Text('', { ...textStyle, fontSize: 11 });
      ammoText.position.set(baseX + 24, HUD_Y + BAR_H * 2 + 26);
      layer.addChild(ammoText);
      this.ammoTexts.push(ammoText);

      // Weapon text (small)
      const weaponText = new Text('', { ...textStyle, fontSize: 10, fill: '#aaaaaa' });
      weaponText.position.set(baseX + 24, HUD_Y + BAR_H * 2 + 40);
      layer.addChild(weaponText);
      this.weaponTexts.push(weaponText);

      // DEAD overlay text
      const deadText = new Text('DEAD', {
        ...textStyle,
        fontSize: 16,
        fill: '#ff4444',
      });
      deadText.position.set(baseX + 24 + BAR_W / 2, HUD_Y + BAR_H / 2);
      deadText.anchor.set(0.5, 0.5);
      deadText.visible = false;
      layer.addChild(deadText);
      this.deadTexts.push(deadText);
    }

    // Wave text (centered)
    this.waveText = new Text('Wave 1', { ...textStyle, fontSize: 18, fill: '#ffcc00' });
    this.waveText.position.set(CANVAS_WIDTH / 2, HUD_Y);
    this.waveText.anchor.set(0.5, 0);
    layer.addChild(this.waveText);

    this.enemyText = new Text('', textStyle);
    this.enemyText.position.set(CANVAS_WIDTH / 2, HUD_Y + 22);
    this.enemyText.anchor.set(0.5, 0);
    layer.addChild(this.enemyText);
  }

  update(): void {
    // Update each player's HUD
    for (let i = 0; i < this.state.players.length; i++) {
      this.updatePlayerHUD(i);
    }

    // Shared texts
    this.waveText.text = `Wave ${this.state.wave}`;
    if (this.state.waveActive) {
      this.enemyText.text = `Enemies: ${this.state.enemiesAlive}`;
    } else {
      this.enemyText.text = '';
    }
  }

  private updatePlayerHUD(index: number): void {
    const ps = this.state.players[index];
    const hp = this.world.get<HealthC>(ps.entityId, C.Health);
    const currentHp = hp ? Math.max(0, hp.current) : 0;

    // DEAD overlay
    this.deadTexts[index].visible = !ps.alive;

    // HP bar
    const hpBar = this.hpBars[index];
    hpBar.clear();
    hpBar.beginFill(0x333333);
    hpBar.drawRoundedRect(0, 0, BAR_W, BAR_H, 3);
    hpBar.endFill();
    const hpPct = currentHp / PLAYER_MAX_HP;
    const hpColor = hpPct > 0.5 ? COLORS.hpBarGreen : COLORS.hpBarRed;
    hpBar.beginFill(hpColor);
    hpBar.drawRoundedRect(0, 0, BAR_W * hpPct, BAR_H, 3);
    hpBar.endFill();
    hpBar.lineStyle(1, 0x666666);
    hpBar.drawRoundedRect(0, 0, BAR_W, BAR_H, 3);

    // XP bar
    const prevLevelXp = xpForLevel(ps.level);
    const nextLevelXp = ps.xpToNextLevel;
    const xpRange = nextLevelXp - prevLevelXp;
    const xpPct = xpRange > 0 ? (ps.xp - prevLevelXp) / xpRange : 0;

    const xpBar = this.xpBars[index];
    xpBar.clear();
    xpBar.beginFill(0x333333);
    xpBar.drawRoundedRect(0, 0, BAR_W, BAR_H - 2, 3);
    xpBar.endFill();
    xpBar.beginFill(COLORS.xpBar);
    xpBar.drawRoundedRect(0, 0, BAR_W * Math.min(1, xpPct), BAR_H - 2, 3);
    xpBar.endFill();
    xpBar.lineStyle(1, 0x666666);
    xpBar.drawRoundedRect(0, 0, BAR_W, BAR_H - 2, 3);

    // Texts
    this.levelTexts[index].text = `Lv ${ps.level}`;
    this.moneyTexts[index].text = `$${ps.money}`;

    // Active gun ammo
    const gun = activeGun(ps);
    if (gun) {
      const gunData = this.weapons.guns[gun.id];
      const gunStats = getGunStats(gun.id, gun.level, this.weapons);
      this.ammoTexts[index].text = `${gunData.name} ${gun.currentAmmo}/${gunStats.ammoMax}`;
    }

    // Weapon loadout
    const meleeData = this.weapons.melee[ps.melee.id];
    const gunParts: string[] = [];
    for (let j = 0; j < ps.guns.length; j++) {
      const g = ps.guns[j];
      const gData = this.weapons.guns[g.id];
      const prefix = j === ps.activeGunIndex ? '>' : ' ';
      gunParts.push(`${prefix}${gData.name}`);
    }
    this.weaponTexts[index].text = `${gunParts.join('|')} ${meleeData.name}`;
  }
}
