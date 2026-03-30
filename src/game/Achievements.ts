import type { Difficulty } from './GameState.ts';

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  check: (stats: RunStats) => boolean;
}

export interface RunStats {
  waveReached: number;
  maxLevel: number;
  totalMoney: number;
  killsThisRun: number;
  bossesDefeated: number;
  difficulty: Difficulty;
  coopGame: boolean;
  weaponsOwned: number;
  // cross-run persistent counters
  totalRuns: number;
  totalKills: number;
}

const STORAGE_KEY_UNLOCKED = 'wog-achievements';
const STORAGE_KEY_STATS = 'wog-run-stats';

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_blood',
    name: 'First Blood',
    description: 'Kill your first enemy',
    icon: '\u2694\uFE0F',
    check: (s) => s.totalKills >= 1,
  },
  {
    id: 'wave_5',
    name: 'Getting Warmed Up',
    description: 'Reach wave 5',
    icon: '\uD83C\uDF0A',
    check: (s) => s.waveReached >= 5,
  },
  {
    id: 'wave_10',
    name: 'Halfway There',
    description: 'Reach wave 10',
    icon: '\uD83D\uDD25',
    check: (s) => s.waveReached >= 10,
  },
  {
    id: 'wave_15',
    name: 'Survivor',
    description: 'Reach wave 15',
    icon: '\uD83C\uDFC6',
    check: (s) => s.waveReached >= 15,
  },
  {
    id: 'boss_slayer',
    name: 'Boss Slayer',
    description: 'Defeat a boss',
    icon: '\uD83D\uDC80',
    check: (s) => s.bossesDefeated >= 1,
  },
  {
    id: 'boss_hunter',
    name: 'Boss Hunter',
    description: 'Defeat all 3 bosses in one run',
    icon: '\uD83D\uDC51',
    check: (s) => s.bossesDefeated >= 3,
  },
  {
    id: 'arsenal',
    name: 'Arsenal',
    description: 'Own 4 or more weapons in a single run',
    icon: '\uD83D\uDD2B',
    check: (s) => s.weaponsOwned >= 4,
  },
  {
    id: 'big_spender',
    name: 'Big Spender',
    description: 'Earn 500+ money in a single run',
    icon: '\uD83D\uDCB0',
    check: (s) => s.totalMoney >= 500,
  },
  {
    id: 'veteran',
    name: 'Veteran',
    description: 'Reach player level 10',
    icon: '\u2B50',
    check: (s) => s.maxLevel >= 10,
  },
  {
    id: 'hardcore',
    name: 'Hardcore',
    description: 'Reach wave 5 on Hard difficulty',
    icon: '\uD83D\uDCA0',
    check: (s) => s.difficulty === 'hard' && s.waveReached >= 5,
  },
  {
    id: 'battle_buddies',
    name: 'Battle Buddies',
    description: 'Complete a wave in Co-Op mode',
    icon: '\uD83E\uDD1D',
    check: (s) => s.coopGame && s.waveReached >= 2,
  },
  {
    id: 'dedicated',
    name: 'Dedicated',
    description: 'Complete 10 runs',
    icon: '\uD83C\uDFAE',
    check: (s) => s.totalRuns >= 10,
  },
];

export function loadUnlocked(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_UNLOCKED);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveUnlocked(unlocked: Record<string, boolean>): void {
  try {
    localStorage.setItem(STORAGE_KEY_UNLOCKED, JSON.stringify(unlocked));
  } catch { /* ignore */ }
}

export interface PersistentStats {
  totalRuns: number;
  totalKills: number;
}

export function loadPersistentStats(): PersistentStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STATS);
    if (!raw) return { totalRuns: 0, totalKills: 0 };
    const s = JSON.parse(raw);
    return {
      totalRuns: typeof s.totalRuns === 'number' ? s.totalRuns : 0,
      totalKills: typeof s.totalKills === 'number' ? s.totalKills : 0,
    };
  } catch {
    return { totalRuns: 0, totalKills: 0 };
  }
}

export function savePersistentStats(stats: PersistentStats): void {
  try {
    localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats));
  } catch { /* ignore */ }
}

/**
 * Check all achievements against current stats.
 * Returns array of newly unlocked achievement IDs.
 */
export function checkAchievements(
  stats: RunStats,
  unlocked: Record<string, boolean>,
): string[] {
  const newlyUnlocked: string[] = [];
  for (const ach of ACHIEVEMENTS) {
    if (unlocked[ach.id]) continue;
    if (ach.check(stats)) {
      unlocked[ach.id] = true;
      newlyUnlocked.push(ach.id);
    }
  }
  return newlyUnlocked;
}
