import type { Input } from '../engine/Input.ts';
import { MenuNavigator } from './MenuNavigator.ts';
import { Music } from '../sfx.ts';
import type { Difficulty } from '../game/GameState.ts';

export interface MainMenuCallbacks {
  onSolo: () => void;
  onCoop: () => void;
}

export class MainMenuUI {
  private overlay: HTMLElement;
  private soloBtn: HTMLElement;
  private coopBtn: HTMLElement;
  private optionsBtn: HTMLElement;
  private achievementsBtn: HTMLElement;
  private exitBtn: HTMLElement;
  private navigator: MenuNavigator;
  private callbacks: MainMenuCallbacks | null = null;

  // Options sub-screen
  private optionsOverlay: HTMLElement;
  private volumeSlider: HTMLInputElement;
  private volumeLabel: HTMLElement;
  private diffBtns: HTMLElement[];
  private backBtn: HTMLElement;
  private optionsNavigator: MenuNavigator;

  // Exit sub-screen
  private exitOverlay: HTMLElement;
  private exitBackBtn: HTMLElement;
  private exitNavigator: MenuNavigator;

  private _difficulty: Difficulty = 'normal';
  private inOptions = false;
  private inExit = false;

  private onShowAchievements: (() => void) | null = null;

  constructor(private input: Input) {
    // Main menu
    this.overlay = document.getElementById('mainmenu-overlay')!;
    this.soloBtn = document.getElementById('menu-solo-btn')!;
    this.coopBtn = document.getElementById('menu-coop-btn')!;
    this.optionsBtn = document.getElementById('menu-options-btn')!;
    this.achievementsBtn = document.getElementById('menu-achievements-btn')!;
    this.exitBtn = document.getElementById('menu-exit-btn')!;
    this.navigator = new MenuNavigator(input);

    this.soloBtn.addEventListener('click', () => this.callbacks?.onSolo());
    this.coopBtn.addEventListener('click', () => this.callbacks?.onCoop());
    this.optionsBtn.addEventListener('click', () => this.showOptions());
    this.achievementsBtn.addEventListener('click', () => this.onShowAchievements?.());
    this.exitBtn.addEventListener('click', () => this.showExit());

    // Options sub-screen
    this.optionsOverlay = document.getElementById('options-overlay')!;
    this.volumeSlider = document.getElementById('options-volume') as HTMLInputElement;
    this.volumeLabel = document.getElementById('options-volume-label')!;
    this.diffBtns = [
      document.getElementById('diff-easy')!,
      document.getElementById('diff-normal')!,
      document.getElementById('diff-hard')!,
    ];
    this.backBtn = document.getElementById('options-back-btn')!;
    this.optionsNavigator = new MenuNavigator(input);

    // Volume slider change
    this.volumeSlider.addEventListener('input', () => {
      const val = parseInt(this.volumeSlider.value);
      Music.volume = val / 100;
      this.volumeLabel.textContent = `${val}%`;
      this.saveSettings();
    });

    // Difficulty buttons
    const diffs: Difficulty[] = ['easy', 'normal', 'hard'];
    this.diffBtns.forEach((btn, i) => {
      btn.addEventListener('click', () => {
        this._difficulty = diffs[i];
        this.updateDiffHighlight();
        this.saveSettings();
      });
    });

    this.backBtn.addEventListener('click', () => this.hideOptions());

    // Exit sub-screen
    this.exitOverlay = document.getElementById('exit-overlay')!;
    this.exitBackBtn = document.getElementById('exit-back-btn')!;
    this.exitNavigator = new MenuNavigator(input);
    this.exitBackBtn.addEventListener('click', () => this.hideExit());

    // Load saved settings
    this.loadSettings();
    this.updateDiffHighlight();
  }

  get difficulty(): Difficulty {
    return this._difficulty;
  }

  get musicVolume(): number {
    return parseInt(this.volumeSlider.value) / 100;
  }

  show(callbacks: MainMenuCallbacks, onShowAchievements: () => void): void {
    this.callbacks = callbacks;
    this.onShowAchievements = onShowAchievements;
    this.inOptions = false;
    this.inExit = false;
    this.overlay.classList.remove('hidden');
    this.optionsOverlay.classList.add('hidden');
    this.exitOverlay.classList.add('hidden');

    // Sync volume slider with current Music.volume
    const vol = Math.round(Music.volume * 100);
    this.volumeSlider.value = String(vol);
    this.volumeLabel.textContent = `${vol}%`;

    this.activateMainNav();
  }

  hide(): void {
    this.navigator.deactivate();
    this.optionsNavigator.deactivate();
    this.exitNavigator.deactivate();
    this.overlay.classList.add('hidden');
    this.optionsOverlay.classList.add('hidden');
    this.exitOverlay.classList.add('hidden');
    this.callbacks = null;
    this.onShowAchievements = null;
    this.inOptions = false;
    this.inExit = false;
  }

  update(dt: number): void {
    if (this.inOptions) {
      this.optionsNavigator.update(dt);
    } else if (this.inExit) {
      this.exitNavigator.update(dt);
    } else {
      this.navigator.update(dt);
    }
  }

  /** Called by external code when returning from achievements screen. */
  returnFromAchievements(): void {
    this.overlay.classList.remove('hidden');
    this.activateMainNav();
  }

  private activateMainNav(): void {
    this.navigator.activate({
      items: [this.soloBtn, this.coopBtn, this.optionsBtn, this.achievementsBtn, this.exitBtn],
      onConfirm: (index) => {
        if (index === 0) this.callbacks?.onSolo();
        else if (index === 1) this.callbacks?.onCoop();
        else if (index === 2) this.showOptions();
        else if (index === 3) this.onShowAchievements?.();
        else if (index === 4) this.showExit();
      },
      wrap: true,
    });
  }

  private showOptions(): void {
    this.inOptions = true;
    this.navigator.deactivate();
    this.overlay.classList.add('hidden');
    this.optionsOverlay.classList.remove('hidden');

    const items = [...this.diffBtns, this.backBtn];
    this.optionsNavigator.activate({
      items,
      onConfirm: (index) => items[index]?.click(),
      onBack: () => this.hideOptions(),
      wrap: true,
    });
  }

  private hideOptions(): void {
    this.inOptions = false;
    this.optionsNavigator.deactivate();
    this.optionsOverlay.classList.add('hidden');
    this.overlay.classList.remove('hidden');
    this.activateMainNav();
  }

  private showExit(): void {
    this.inExit = true;
    this.navigator.deactivate();
    this.overlay.classList.add('hidden');
    this.exitOverlay.classList.remove('hidden');

    this.exitNavigator.activate({
      items: [this.exitBackBtn],
      onConfirm: () => this.hideExit(),
      onBack: () => this.hideExit(),
      wrap: false,
    });
  }

  private hideExit(): void {
    this.inExit = false;
    this.exitNavigator.deactivate();
    this.exitOverlay.classList.add('hidden');
    this.overlay.classList.remove('hidden');
    this.activateMainNav();
  }

  private updateDiffHighlight(): void {
    const diffs: Difficulty[] = ['easy', 'normal', 'hard'];
    this.diffBtns.forEach((btn, i) => {
      btn.classList.toggle('active', diffs[i] === this._difficulty);
    });
  }

  private saveSettings(): void {
    try {
      localStorage.setItem('wog-settings', JSON.stringify({
        difficulty: this._difficulty,
        volume: Music.volume,
      }));
    } catch { /* ignore */ }
  }

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('wog-settings');
      if (!saved) return;
      const s = JSON.parse(saved);
      if (s.difficulty && ['easy', 'normal', 'hard'].includes(s.difficulty)) {
        this._difficulty = s.difficulty;
      }
      if (typeof s.volume === 'number') {
        Music.volume = s.volume;
        const pct = Math.round(s.volume * 100);
        this.volumeSlider.value = String(pct);
        this.volumeLabel.textContent = `${pct}%`;
      }
    } catch { /* ignore */ }
  }
}
