import { PLAYER_MAX_HP } from './constants.ts';
import type { WeaponsData } from '../data/types.ts';
import { xpForLevel } from './rules.ts';

export type GamePhase = 'mainmenu' | 'playing' | 'shop' | 'paused' | 'levelup' | 'gameover';

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface GameSettings {
  playerCount: 1 | 2;
  difficulty: Difficulty;
  musicVolume: number; // 0-1
}

export const DIFFICULTY_MULTIPLIERS: Record<Difficulty, { enemyHp: number; enemySpeed: number }> = {
  easy:   { enemyHp: 0.7, enemySpeed: 0.85 },
  normal: { enemyHp: 1.0, enemySpeed: 1.0 },
  hard:   { enemyHp: 1.5, enemySpeed: 1.15 },
};

export interface WeaponInstance {
  id: string;
  level: number;
  currentAmmo: number; // -1 for melee
}

/** Per-player state (independent progression). */
export interface PlayerState {
  entityId: number;
  playerIndex: number; // 0 = P1, 1 = P2
  alive: boolean;
  money: number;
  xp: number;
  level: number;
  xpToNextLevel: number;
  guns: WeaponInstance[];
  activeGunIndex: number;
  ownedGunIds: string[];
  ownedMeleeIds: string[];
  gunBank: Record<string, WeaponInstance>;
  meleeBank: Record<string, WeaponInstance>;
  gunCooldowns: number[];
  melee: WeaponInstance;
  pendingLevelUps: number;
  meleeCooldown: number;
  meleeSwingTimer: number;
  meleeSwingAngle: number;
}

/** Tracks stats for achievement checks within a single run. */
export interface CurrentRunStats {
  killsThisRun: number;
  moneyEarned: number;
  bossesDefeated: number;
}

export interface GameState {
  phase: GamePhase;
  previousPhase: GamePhase; // for pause/unpause
  players: PlayerState[];
  activeShopPlayerIndex: number; // whose turn in shop/levelup
  wave: number;
  enemiesAlive: number;
  totalEnemiesInWave: number;
  waveEndTimer: number;
  waveActive: boolean;
  bossId: number;
  bossName: string;
  isBossWave: boolean;
  maxWave: number;
  settings: GameSettings;
  runStats: CurrentRunStats;
}

/** Helper to get the currently active gun for a player. */
export function activeGun(ps: PlayerState): WeaponInstance {
  return ps.guns[ps.activeGunIndex];
}

function createInitialPlayerState(
  weapons: WeaponsData,
  entityId: number,
  playerIndex: number,
): PlayerState {
  const pistol = weapons.guns['pistol'];
  const pistolInst: WeaponInstance = { id: 'pistol', level: 0, currentAmmo: pistol.ammoMax };
  const swordInst: WeaponInstance = { id: 'sword', level: 0, currentAmmo: -1 };
  return {
    entityId,
    playerIndex,
    alive: true,
    money: 0,
    xp: 0,
    level: 1,
    xpToNextLevel: xpForLevel(2),
    guns: [pistolInst],
    activeGunIndex: 0,
    ownedGunIds: ['pistol'],
    ownedMeleeIds: ['sword'],
    gunBank: { pistol: pistolInst },
    meleeBank: { sword: swordInst },
    gunCooldowns: [0, 0],
    melee: swordInst,
    pendingLevelUps: 0,
    meleeCooldown: 0,
    meleeSwingTimer: 0,
    meleeSwingAngle: 0,
  };
}

export function createInitialState(
  weapons: WeaponsData,
  playerIds: number[],
  settings: GameSettings,
): GameState {
  return {
    phase: 'playing',
    previousPhase: 'playing',
    players: playerIds.map((id, i) => createInitialPlayerState(weapons, id, i)),
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
    settings,
    runStats: { killsThisRun: 0, moneyEarned: 0, bossesDefeated: 0 },
  };
}

export function resetState(
  state: GameState,
  weapons: WeaponsData,
  playerIds: number[],
  settings: GameSettings,
): void {
  const fresh = createInitialState(weapons, playerIds, settings);
  Object.assign(state, fresh);
}

export function getPlayerHp(): number {
  return PLAYER_MAX_HP;
}

// ── Helpers ────────────────────────────────────────────────────

export function getAlivePlayerIds(state: GameState): number[] {
  return state.players.filter(p => p.alive).map(p => p.entityId);
}

export function getPlayerStateByEntityId(
  state: GameState,
  entityId: number,
): PlayerState | undefined {
  return state.players.find(p => p.entityId === entityId);
}

export function anyPlayerHasPendingLevelUps(state: GameState): boolean {
  return state.players.some(p => p.pendingLevelUps > 0);
}
