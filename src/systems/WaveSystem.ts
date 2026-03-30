import { Container } from 'pixi.js';
import { World } from '../engine/World.ts';
import {
  C,
  type TransformC,
  type HealthC,
  type ColliderC,
  type SpriteC,
  type BossType,
} from '../components/index.ts';
import type { GameState } from '../game/GameState.ts';
import { anyPlayerHasPendingLevelUps, DIFFICULTY_MULTIPLIERS } from '../game/GameState.ts';
import type { EnemiesData, WavesData, SpawnGroup } from '../data/types.ts';
import { createEnemy, createBoss, randomEdgePosition } from '../game/spawner.ts';
import { WAVE_END_DELAY, ARENA_WIDTH, ARENA_HEIGHT, PLAYER_MAX_HP, PLAYER_RADIUS } from '../game/constants.ts';
import { SFX } from '../sfx.ts';

interface PendingGroup {
  enemy: string;
  remaining: number;
  delay: number;
  timer: number;
  started: boolean;
}

export class WaveSystem {
  private pendingGroups: PendingGroup[] = [];
  private waveTime = 0;
  private bossSpawned = false;

  constructor(
    private world: World,
    private state: GameState,
    private enemies: EnemiesData,
    private waves: WavesData,
    private gameLayer: Container,
  ) {}

  /** Call when transitioning to a new wave. */
  startWave(): void {
    const waveNum = this.state.wave;
    const config = this.getWaveConfig(waveNum);
    this.waveTime = 0;
    this.bossSpawned = false;

    this.pendingGroups = config.groups.map((g: SpawnGroup) => ({
      enemy: g.enemy,
      remaining: g.count,
      delay: g.delay,
      timer: 0,
      started: false,
    }));

    // Count total enemies
    let total = 0;
    for (const g of config.groups) total += g.count;

    // Check if this is a boss wave
    this.state.isBossWave = config.boss === true;
    if (this.state.isBossWave) {
      total += 1; // boss counts as an enemy
    }

    this.state.totalEnemiesInWave = total;
    this.state.enemiesAlive = 0;
    this.state.waveEndTimer = -1;
    this.state.waveActive = true;
    SFX.waveStart();
  }

  update(dt: number): void {
    if (!this.state.waveActive) return;
    this.waveTime += dt;

    // Spawn pending groups
    for (const group of this.pendingGroups) {
      if (group.remaining <= 0) continue;
      if (this.waveTime < group.delay) continue;

      if (!group.started) {
        group.started = true;
        group.timer = 0;
      }

      group.timer -= dt;
      if (group.timer <= 0) {
        this.spawnEnemy(group.enemy);
        group.remaining--;
        group.timer = 0.3; // spawn interval within a group
      }
    }

    // Spawn boss after a short delay on boss waves
    if (this.state.isBossWave && !this.bossSpawned && this.waveTime >= 2.0) {
      this.spawnBoss();
      this.bossSpawned = true;
    }

    // Check if all spawns done and all enemies dead
    const allSpawned = this.pendingGroups.every((g) => g.remaining <= 0) &&
      (!this.state.isBossWave || this.bossSpawned);

    // Count living enemies
    this.state.enemiesAlive = this.world.query(C.Enemy).length;

    if (allSpawned && this.state.enemiesAlive === 0) {
      if (this.state.waveEndTimer < 0) {
        this.state.waveEndTimer = WAVE_END_DELAY;
      }
      this.state.waveEndTimer -= dt;
      if (this.state.waveEndTimer <= 0) {
        this.endWave();
      }
    }
  }

  private endWave(): void {
    // Track boss defeat for achievements
    if (this.state.isBossWave) {
      this.state.runStats.bossesDefeated++;
    }

    this.state.waveActive = false;
    this.state.isBossWave = false;
    this.state.bossId = -1;

    // Revive dead players at wave end
    for (const ps of this.state.players) {
      if (!ps.alive) {
        ps.alive = true;
        // Restore health
        const hp = this.world.get<HealthC>(ps.entityId, C.Health);
        if (hp) {
          hp.current = PLAYER_MAX_HP;
          hp.invincibleTimer = 0;
          hp.flashTimer = 0;
        }
        // Re-add collider
        this.world.add<ColliderC>(ps.entityId, C.Collider, {
          radius: PLAYER_RADIUS,
          layer: 'player',
        });
        // Make sprite visible again
        const sprite = this.world.get<SpriteC>(ps.entityId, C.Sprite);
        if (sprite) sprite.gfx.visible = true;
        // Teleport to center
        const t = this.world.get<TransformC>(ps.entityId, C.Transform);
        if (t) {
          t.x = ARENA_WIDTH / 2;
          t.y = ARENA_HEIGHT / 2;
        }
      }
    }

    // Transition: level-up first (if any player has pending), then shop
    if (anyPlayerHasPendingLevelUps(this.state)) {
      this.state.activeShopPlayerIndex = 0;
      this.state.phase = 'levelup';
    } else {
      this.state.activeShopPlayerIndex = 0;
      this.state.phase = 'shop';
    }
  }

  private spawnBoss(): void {
    // Randomly pick one of the three bosses
    const bossTypes: BossType[] = ['dungeonLord', 'infernoWyrm', 'crystalGolem'];
    const bossType = bossTypes[Math.floor(Math.random() * bossTypes.length)];
    const bossData = this.enemies[bossType];
    if (!bossData) return;

    // Spawn boss at top center of arena
    const bossEntity = createBoss(
      this.world,
      this.gameLayer,
      ARENA_WIDTH / 2,
      200,
      bossData,
      bossType,
    );
    this.state.bossId = bossEntity;
    this.state.bossName = bossData.name;
  }

  private spawnEnemy(enemyId: string): void {
    const data = this.enemies[enemyId];
    if (!data) return;
    const pos = randomEdgePosition();

    // HP scaling for waves beyond 10
    let hpMult = 1;
    if (this.state.wave > 10) {
      const over = this.state.wave - 10;
      hpMult = Math.pow(this.waves.scalingPerWaveBeyond10.enemyHpMultiplier, over);
    }

    // Apply difficulty multiplier
    const diffMult = DIFFICULTY_MULTIPLIERS[this.state.settings.difficulty];
    hpMult *= diffMult.enemyHp;

    createEnemy(this.world, this.gameLayer, pos.x, pos.y, data, hpMult, diffMult.enemySpeed);
  }

  private getWaveConfig(waveNum: number) {
    // Defined waves
    const defined = this.waves.waves.find((w) => w.wave === waveNum);
    if (defined) return defined;

    // Scale beyond defined waves
    const lastWave = this.waves.waves[this.waves.waves.length - 1];
    const over = waveNum - lastWave.wave;
    const mult = Math.pow(this.waves.scalingPerWaveBeyond10.enemyCountMultiplier, over);

    return {
      wave: waveNum,
      groups: lastWave.groups.map((g) => ({
        ...g,
        count: Math.ceil(g.count * mult),
      })),
    };
  }
}
