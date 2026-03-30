import type { GameState } from '../game/GameState.ts';
import type { Input } from '../engine/Input.ts';
import { MenuNavigator } from './MenuNavigator.ts';

export class PauseMenu {
  private overlay: HTMLElement;
  private resumeBtn: HTMLElement;
  private restartBtn: HTMLElement;
  private onResume: (() => void) | null = null;
  private onRestart: (() => void) | null = null;
  private navigator: MenuNavigator;

  constructor(
    private _state: GameState,
    input: Input,
  ) {
    this.overlay = document.getElementById('pause-overlay')!;
    this.resumeBtn = document.getElementById('resume-btn')!;
    this.restartBtn = document.getElementById('restart-btn')!;
    this.navigator = new MenuNavigator(input);

    this.resumeBtn.addEventListener('click', () => {
      if (this.onResume) this.onResume();
    });

    this.restartBtn.addEventListener('click', () => {
      if (this.onRestart) this.onRestart();
    });
  }

  show(onResume: () => void, onRestart: () => void): void {
    this.onResume = onResume;
    this.onRestart = onRestart;
    this.overlay.classList.remove('hidden');
    this.navigator.activate({
      items: [this.resumeBtn, this.restartBtn],
      onConfirm: (index) => {
        if (index === 0 && this.onResume) this.onResume();
        if (index === 1 && this.onRestart) this.onRestart();
      },
      onBack: () => {
        // B button = resume (same as pressing pause again)
        if (this.onResume) this.onResume();
      },
      wrap: true,
    });
  }

  hide(): void {
    this.navigator.deactivate();
    this.overlay.classList.add('hidden');
    this.onResume = null;
    this.onRestart = null;
  }

  /** Call each frame while paused. */
  update(dt: number): void {
    this.navigator.update(dt);
  }
}
