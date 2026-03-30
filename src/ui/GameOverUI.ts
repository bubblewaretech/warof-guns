import type { GameState } from '../game/GameState.ts';
import type { Input } from '../engine/Input.ts';
import { MenuNavigator } from './MenuNavigator.ts';

export class GameOverUI {
  private overlay: HTMLElement;
  private statsDiv: HTMLElement;
  private restartBtn: HTMLElement;
  private onRestart: (() => void) | null = null;
  private navigator: MenuNavigator;

  constructor(
    private state: GameState,
    input: Input,
  ) {
    this.overlay = document.getElementById('gameover-overlay')!;
    this.statsDiv = document.getElementById('gameover-stats')!;
    this.restartBtn = document.getElementById('restart-gameover-btn')!;
    this.navigator = new MenuNavigator(input);

    this.restartBtn.addEventListener('click', () => {
      if (this.onRestart) this.onRestart();
    });
  }

  show(onRestart: () => void): void {
    this.onRestart = onRestart;
    const colors = ['#44ff44', '#4488ff'];
    const labels = ['P1', 'P2'];
    let statsHtml = `<div>Reached Wave ${this.state.wave}</div>`;
    for (let i = 0; i < this.state.players.length; i++) {
      const ps = this.state.players[i];
      statsHtml += `<div style="margin-top: ${i === 0 ? '12' : '4'}px; color: ${colors[i]};">${labels[i]}: Level ${ps.level} | $${ps.money}</div>`;
    }
    this.statsDiv.innerHTML = statsHtml;
    this.overlay.classList.remove('hidden');
    this.navigator.activate({
      items: [this.restartBtn],
      onConfirm: () => {
        if (this.onRestart) this.onRestart();
      },
      wrap: false,
    });
  }

  hide(): void {
    this.navigator.deactivate();
    this.overlay.classList.add('hidden');
    this.onRestart = null;
  }

  /** Call each frame while game over screen is visible. */
  update(dt: number): void {
    this.navigator.update(dt);
  }
}
