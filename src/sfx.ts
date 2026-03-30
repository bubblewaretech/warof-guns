/**
 * SFX stubs. Replace each function body with actual Web Audio API
 * or Howler.js calls when adding real sound.
 */
export const SFX = {
  shoot: () => {
    /* TODO: gunshot sound */
  },
  meleeSwing: () => {
    /* TODO: melee whoosh */
  },
  hit: () => {
    /* TODO: hit impact */
  },
  enemyDie: () => {
    /* TODO: enemy death */
  },
  playerHit: () => {
    /* TODO: player hurt */
  },
  emptyGun: () => {
    /* TODO: dry fire click */
  },
  purchase: () => {
    /* TODO: cash register */
  },
  levelUp: () => {
    /* TODO: level up fanfare */
  },
  waveStart: () => {
    /* TODO: wave horn */
  },
  explosion: () => {
    /* TODO: explosion boom */
  },
};

// ── Background Music ─────────────────────────────────────────

import bgMusicUrl from '/background-music.wav?url';

class MusicPlayer {
  private audio: HTMLAudioElement | null = null;
  private _volume = 0.35;
  private started = false;

  /** Initialise the audio element (call once). */
  init(): void {
    if (this.audio) return;
    this.audio = new Audio(bgMusicUrl);
    this.audio.loop = true;
    this.audio.volume = this._volume;
  }

  /** Start playback. Browsers require a user-gesture first, so we
   *  silently catch the rejected promise and retry on next call. */
  play(): void {
    if (!this.audio) this.init();
    if (this.started) return;
    this.audio!.play().then(() => {
      this.started = true;
    }).catch(() => {
      // Autoplay blocked — will retry on next user interaction
    });
  }

  pause(): void {
    this.audio?.pause();
    this.started = false;
  }

  resume(): void {
    if (!this.audio) return;
    this.audio.play().catch(() => {});
    this.started = true;
  }

  get volume(): number {
    return this._volume;
  }

  set volume(v: number) {
    this._volume = Math.max(0, Math.min(1, v));
    if (this.audio) this.audio.volume = this._volume;
  }

  get playing(): boolean {
    return this.started && !!this.audio && !this.audio.paused;
  }
}

export const Music = new MusicPlayer();
