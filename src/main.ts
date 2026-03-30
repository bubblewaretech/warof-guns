import { Application, Container, Graphics } from 'pixi.js';
import { World } from './engine/World.ts';
import { Input } from './engine/Input.ts';
import { GameLoop } from './engine/GameLoop.ts';
import { C, type SpriteC, type TransformC } from './components/index.ts';
import { createInitialState, type GameState, type GameSettings, type Difficulty } from './game/GameState.ts';
import { createPlayer, createWall, createSpike } from './game/spawner.ts';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  ARENA_WIDTH,
  ARENA_HEIGHT,
  PLAYER_MAX_HP,
} from './game/constants.ts';
import type { WeaponsData, EnemiesData, WavesData } from './data/types.ts';
import type { PlayerCombatInput } from './systems/CombatSystem.ts';

import { InputSystem } from './systems/InputSystem.ts';
import { MovementSystem } from './systems/MovementSystem.ts';
import { CombatSystem } from './systems/CombatSystem.ts';
import { EnemyAISystem } from './systems/EnemyAISystem.ts';
import { WaveSystem } from './systems/WaveSystem.ts';
import { CollisionSystem } from './systems/CollisionSystem.ts';
import { ProjectileSystem } from './systems/ProjectileSystem.ts';
import { RenderSystem } from './systems/RenderSystem.ts';
import { HealthSystem } from './systems/HealthSystem.ts';
import { HazardSystem } from './systems/HazardSystem.ts';
import { BossAISystem } from './systems/BossAISystem.ts';

import { HUD } from './ui/HUD.ts';
import { ShopUI } from './ui/ShopUI.ts';
import { PauseMenu } from './ui/PauseMenu.ts';
import { LevelUpUI } from './ui/LevelUpUI.ts';
import { GameOverUI } from './ui/GameOverUI.ts';
import { DamageNumbers } from './ui/DamageNumbers.ts';
import { BossHealthBar } from './ui/BossHealthBar.ts';
import { ExplosionFX } from './ui/ExplosionFX.ts';
import { MainMenuUI } from './ui/MainMenuUI.ts';
import { AchievementsUI } from './ui/AchievementsUI.ts';
import {
  loadUnlocked, saveUnlocked,
  loadPersistentStats, savePersistentStats,
  checkAchievements,
  type RunStats,
} from './game/Achievements.ts';

import { generateArenaLayout, type ArenaObstacles } from './game/ArenaLayout.ts';
import { drawDungeonBackground, drawObstacles } from './game/ArenaRenderer.ts';
import { Music } from './sfx.ts';

import weaponsJson from './data/weapons.json';
import enemiesJson from './data/enemies.json';
import wavesJson from './data/waves.json';

const weapons = weaponsJson as unknown as WeaponsData;
const enemies = enemiesJson as unknown as EnemiesData;
const waves = wavesJson as unknown as WavesData;

// ── Bootstrap ─────────────────────────────────────────────────

const app = new Application({
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  backgroundColor: 0x1a1a2e,
  view: document.getElementById('game-canvas') as HTMLCanvasElement,
  antialias: true,
});

// Layers
const gameLayer = new Container();
const uiLayer = new Container();
app.stage.addChild(gameLayer);
app.stage.addChild(uiLayer);

// Draw arena background (dungeon-style)
const arenaBg = new Graphics();
drawDungeonBackground(arenaBg);
gameLayer.addChild(arenaBg);

// Obstacle visual layer (drawn between background and entities)
const obstacleGfx = new Graphics();
gameLayer.addChild(obstacleGfx);

// Entity layer (above background)
const entityLayer = new Container();
gameLayer.addChild(entityLayer);

// ── Deferred Game Objects (initialised by startGame) ──────────

let world = new World();
let damageNumbers = new DamageNumbers(entityLayer);
let explosionFX = new ExplosionFX(entityLayer);
let currentObstacles: ArenaObstacles = { walls: [], spikes: [] };

// Input (always available)
const input = new Input(app.view as HTMLCanvasElement);

// State starts in mainmenu phase with no players
const defaultSettings: GameSettings = { playerCount: 1, difficulty: 'normal', musicVolume: 0.35 };
const state: GameState = {
  phase: 'mainmenu',
  previousPhase: 'mainmenu',
  players: [],
  activeShopPlayerIndex: 0,
  wave: 1,
  enemiesAlive: 0,
  totalEnemiesInWave: 0,
  waveEndTimer: -1,
  waveActive: false,
  bossId: -1,
  bossName: '',
  isBossWave: false,
  maxWave: 15,
  settings: defaultSettings,
  runStats: { killsThisRun: 0, moneyEarned: 0, bossesDefeated: 0 },
};

// Systems — nullable until game starts
let inputSystem1: InputSystem | null = null;
let inputSystem2: InputSystem | null = null;
const movementSystem = new MovementSystem();
const projectileSystem = new ProjectileSystem();
let combatSystem: CombatSystem;
let enemyAISystem: EnemyAISystem;
let waveSystem: WaveSystem;
let collisionSystem: CollisionSystem;
let healthSystem: HealthSystem;
let renderSystem: RenderSystem | null = null;
let hazardSystem: HazardSystem;
let bossAISystem: BossAISystem;

// ── UI ────────────────────────────────────────────────────────

let hud: HUD | null = null;
const shopUI = new ShopUI(state, weapons, world, input);
const pauseMenu = new PauseMenu(state, input);
const levelUpUI = new LevelUpUI(state, weapons, input);
const gameOverUI = new GameOverUI(state, input);
let bossHealthBar: BossHealthBar | null = null;
const mainMenuUI = new MainMenuUI(input);
const achievementsUI = new AchievementsUI(input);
let inAchievements = false;

const gameLayerOffset = () => ({
  x: gameLayer.position.x,
  y: gameLayer.position.y,
});

const P_OFFSET = 50;

// ── Arena Obstacles ──────────────────────────────────────────

function setupWaveObstacles(waveNum: number): void {
  // Clear old wall/spike entities
  for (const entity of world.query(C.Wall)) {
    world.markDestroy(entity);
  }
  for (const entity of world.query(C.Spike)) {
    world.markDestroy(entity);
  }
  world.flushDestroy();

  // Generate new layout
  currentObstacles = generateArenaLayout(waveNum);

  // Create wall entities
  for (const rect of currentObstacles.walls) {
    createWall(world, entityLayer, rect);
  }

  // Create spike entities
  for (const rect of currentObstacles.spikes) {
    createSpike(world, entityLayer, rect);
  }

  // Redraw obstacle visuals
  obstacleGfx.clear();
  drawObstacles(obstacleGfx, currentObstacles);
}

// ── Game Flow ─────────────────────────────────────────────────

function startNewWave(): void {
  state.phase = 'playing';
  setupWaveObstacles(state.wave);
  waveSystem.startWave();

  // Start / resume background music
  Music.play();

  // Show boss health bar on boss waves
  if (!state.isBossWave && bossHealthBar) {
    bossHealthBar.hide();
  }
}

function startGame(playerCount: 1 | 2, difficulty: Difficulty): void {
  // Hide main menu
  mainMenuUI.hide();

  // Clear any leftover state
  entityLayer.removeChildren();
  uiLayer.removeChildren();
  obstacleGfx.clear();

  // Fresh world
  world = new World();
  damageNumbers = new DamageNumbers(entityLayer);
  explosionFX = new ExplosionFX(entityLayer);

  // Create players based on count
  const playerIds: number[] = [];
  const p1X = playerCount > 1 ? ARENA_WIDTH / 2 - P_OFFSET : ARENA_WIDTH / 2;
  playerIds.push(createPlayer(world, entityLayer, p1X, ARENA_HEIGHT / 2, 0));

  if (playerCount > 1) {
    playerIds.push(createPlayer(world, entityLayer, ARENA_WIDTH / 2 + P_OFFSET, ARENA_HEIGHT / 2, 1));
  }

  // Build settings
  const settings: GameSettings = {
    playerCount,
    difficulty,
    musicVolume: Music.volume,
  };

  // Reset state
  const fresh = createInitialState(weapons, playerIds, settings);
  Object.assign(state, fresh);

  // Create systems
  inputSystem1 = new InputSystem(world, input.gamepad1, state.players[0], gameLayerOffset);
  inputSystem2 = playerCount > 1
    ? new InputSystem(world, input.gamepad2, state.players[1], gameLayerOffset)
    : null;

  combatSystem = new CombatSystem(world, state, weapons, entityLayer, damageNumbers);
  enemyAISystem = new EnemyAISystem(world, state, entityLayer);
  waveSystem = new WaveSystem(world, state, enemies, waves, entityLayer);
  collisionSystem = new CollisionSystem(world, state, damageNumbers, explosionFX);
  healthSystem = new HealthSystem();
  renderSystem = new RenderSystem(world, state, weapons, entityLayer);
  hazardSystem = new HazardSystem(world, state, damageNumbers);
  bossAISystem = new BossAISystem(world, state, entityLayer, enemies);
  hud = new HUD(uiLayer, state, weapons, world);
  bossHealthBar = new BossHealthBar(uiLayer);
  shopUI.setWorld(world);

  // Reset phase tracking
  prevPhase = state.phase;

  // Start wave 1
  startNewWave();
}

function openAchievements(): void {
  inAchievements = true;
  mainMenuUI.hide();
  achievementsUI.show(() => {
    inAchievements = false;
    achievementsUI.hide();
    showMainMenu();
  });
}

function showMainMenu(): void {
  state.phase = 'mainmenu';
  inAchievements = false;
  mainMenuUI.show(
    {
      onSolo: () => startGame(1, mainMenuUI.difficulty),
      onCoop: () => startGame(2, mainMenuUI.difficulty),
    },
    openAchievements,
  );
}

function openShop(): void {
  // Heal ALL players to full between waves
  for (const ps of state.players) {
    const hp = world.get(ps.entityId, C.Health) as { current: number; max: number } | undefined;
    if (hp) {
      hp.current = PLAYER_MAX_HP;
    }
  }

  state.phase = 'shop';

  shopUI.show(() => {
    // All players done shopping — start next wave
    state.wave++;
    startNewWave();
  });
}

function openLevelUp(): void {
  // Check if any player has pending level-ups
  const hasPending = state.players.some(p => p.pendingLevelUps > 0);
  if (!hasPending) {
    openShop();
    return;
  }

  state.phase = 'levelup';

  levelUpUI.show(() => {
    // After all level-ups processed, go to shop
    openShop();
  });
}

function handlePause(): void {
  if (state.phase === 'playing') {
    state.previousPhase = state.phase;
    state.phase = 'paused';
    Music.pause();
    pauseMenu.show(
      () => {
        // Resume
        pauseMenu.hide();
        state.phase = state.previousPhase;
        Music.resume();
      },
      () => {
        // Restart — return to main menu
        pauseMenu.hide();
        restartGame();
      },
    );
  } else if (state.phase === 'paused') {
    pauseMenu.hide();
    state.phase = state.previousPhase;
    Music.resume();
  }
}

function finalizeAchievements(): void {
  // Update persistent cross-run stats
  const persistent = loadPersistentStats();
  persistent.totalRuns++;
  persistent.totalKills += state.runStats.killsThisRun;
  savePersistentStats(persistent);

  // Build full RunStats for achievement checks
  const maxLevel = Math.max(...state.players.map(p => p.level), 1);
  const weaponsOwned = Math.max(
    ...state.players.map(p => p.ownedGunIds.length + p.ownedMeleeIds.length),
    0,
  );
  const runStats: RunStats = {
    waveReached: state.wave,
    maxLevel,
    totalMoney: state.runStats.moneyEarned,
    killsThisRun: state.runStats.killsThisRun,
    bossesDefeated: state.runStats.bossesDefeated,
    difficulty: state.settings.difficulty,
    coopGame: state.settings.playerCount > 1,
    weaponsOwned,
    totalRuns: persistent.totalRuns,
    totalKills: persistent.totalKills,
  };

  // Check and save achievements
  const unlocked = loadUnlocked();
  checkAchievements(runStats, unlocked);
  saveUnlocked(unlocked);
}

function handleGameOver(): void {
  Music.pause();
  finalizeAchievements();
  gameOverUI.show(() => {
    gameOverUI.hide();
    restartGame();
  });
}

function restartGame(): void {
  // Clean up all overlays
  shopUI.hide();
  pauseMenu.hide();
  levelUpUI.hide();
  gameOverUI.hide();
  achievementsUI.hide();
  if (bossHealthBar) bossHealthBar.hide();
  damageNumbers.clear();
  explosionFX.clear();
  Music.pause();

  // Destroy all sprite graphics
  world.flushDestroy();
  for (const entity of world.query(C.Sprite)) {
    const sprite = world.get<SpriteC>(entity, C.Sprite);
    if (sprite && sprite.gfx.parent) {
      sprite.gfx.parent.removeChild(sprite.gfx);
      sprite.gfx.destroy();
    }
  }

  // Clear layers
  entityLayer.removeChildren();
  uiLayer.removeChildren();
  obstacleGfx.clear();

  // Nullify systems
  inputSystem1 = null;
  inputSystem2 = null;
  renderSystem = null;
  hud = null;
  bossHealthBar = null;
  state.players = [];

  // Return to main menu
  showMainMenu();
}

// ── Main Loop ─────────────────────────────────────────────────

let prevPhase = state.phase;

function update(dt: number): void {
  // Poll gamepads at start of frame
  input.pollGamepads();

  // Main menu: only update menu navigation, skip everything else
  if (state.phase === 'mainmenu') {
    if (inAchievements) {
      achievementsUI.update(dt);
    } else {
      mainMenuUI.update(dt);
    }
    input.endFrame();
    return;
  }

  // Pause toggle — either player's START button
  const p1Pause = inputSystem1?.checkPause() ?? false;
  const p2Pause = inputSystem2?.checkPause() ?? false;
  if (p1Pause || p2Pause) {
    handlePause();
    input.endFrame();
    return;
  }

  // Phase transitions
  if (state.phase === 'gameover' && prevPhase !== 'gameover') {
    handleGameOver();
  }
  if (state.phase === 'levelup' && prevPhase === 'playing') {
    openLevelUp();
  }
  if (state.phase === 'shop' && prevPhase === 'playing') {
    openShop();
  }
  prevPhase = state.phase;

  // Update active menu navigation (controller / keyboard)
  if (state.phase === 'shop') {
    shopUI.update(dt);
  } else if (state.phase === 'levelup') {
    levelUpUI.update(dt);
  } else if (state.phase === 'paused') {
    pauseMenu.update(dt);
  } else if (state.phase === 'gameover') {
    gameOverUI.update(dt);
  }

  // Only run game logic in playing phase
  if (state.phase === 'playing') {
    inputSystem1?.update(dt);
    inputSystem2?.update(dt);

    // Weapon switching per player (LB/RB)
    for (let i = 0; i < state.players.length; i++) {
      const sys = i === 0 ? inputSystem1 : inputSystem2;
      if (!sys) continue;
      const ps = state.players[i];
      const switchIdx = sys.switchGunIndex;
      if (switchIdx >= 0 && switchIdx < ps.guns.length && switchIdx !== ps.activeGunIndex) {
        ps.activeGunIndex = switchIdx;
      }
    }

    // Build combat inputs (only for players that exist)
    const combatInputs: PlayerCombatInput[] = [];
    if (inputSystem1) {
      combatInputs.push({
        playerState: state.players[0],
        shootHeld: inputSystem1.shootHeld,
        meleePressed: inputSystem1.meleePressed,
      });
    }
    if (state.players.length > 1 && inputSystem2) {
      combatInputs.push({
        playerState: state.players[1],
        shootHeld: inputSystem2.shootHeld,
        meleePressed: inputSystem2.meleePressed,
      });
    }

    enemyAISystem.update(dt);
    bossAISystem.update(dt);
    combatSystem.update(dt, combatInputs);
    movementSystem.update(world, dt);
    projectileSystem.update(world, dt);
    collisionSystem.update(dt);
    hazardSystem.update(dt);
    healthSystem.update(world, state, dt);
    waveSystem.update(dt);

    // Show boss health bar once boss spawns
    if (state.isBossWave && state.bossId >= 0 && bossHealthBar) {
      bossHealthBar.show();
    }

    // Destroy dead entities (clean up sprites)
    world.flushDestroy((entity) => {
      const sprite = world.get<SpriteC>(entity, C.Sprite);
      if (sprite && sprite.gfx.parent) {
        sprite.gfx.parent.removeChild(sprite.gfx);
        sprite.gfx.destroy();
      }
      // Clear boss reference if boss dies
      if (entity === state.bossId) {
        state.bossId = -1;
        if (bossHealthBar) bossHealthBar.hide();
      }
    });
  }

  // Rendering always runs (when game is active)
  if (renderSystem) renderSystem.update(dt);
  damageNumbers.update(dt);
  explosionFX.update(dt);
  if (hud) hud.update();
  if (bossHealthBar) bossHealthBar.update(world, state);

  // Camera follows midpoint of alive players
  const alivePlayers = state.players.filter(p => p.alive);
  if (alivePlayers.length > 0) {
    let sumX = 0;
    let sumY = 0;
    for (const ps of alivePlayers) {
      const t = world.get<TransformC>(ps.entityId, C.Transform);
      if (t) {
        sumX += t.x;
        sumY += t.y;
      }
    }
    const midX = sumX / alivePlayers.length;
    const midY = sumY / alivePlayers.length;

    let camX = CANVAS_WIDTH / 2 - midX;
    let camY = CANVAS_HEIGHT / 2 - midY;
    // Clamp so camera doesn't show outside arena
    camX = Math.min(0, Math.max(CANVAS_WIDTH - ARENA_WIDTH, camX));
    camY = Math.min(0, Math.max(CANVAS_HEIGHT - ARENA_HEIGHT, camY));
    gameLayer.position.set(camX, camY);
  }

  input.endFrame();
}

const loop = new GameLoop(update);

// Initialise music (browsers block autoplay until user gesture)
Music.init();

// Start on main menu
showMainMenu();
loop.start();
