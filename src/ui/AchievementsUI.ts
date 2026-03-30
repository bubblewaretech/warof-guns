import type { Input } from '../engine/Input.ts';
import { MenuNavigator } from './MenuNavigator.ts';
import { ACHIEVEMENTS, loadUnlocked } from '../game/Achievements.ts';

export class AchievementsUI {
  private overlay: HTMLElement;
  private grid: HTMLElement;
  private backBtn: HTMLElement;
  private navigator: MenuNavigator;
  private onBack: (() => void) | null = null;

  constructor(input: Input) {
    this.overlay = document.getElementById('achievements-overlay')!;
    this.grid = document.getElementById('achievements-grid')!;
    this.backBtn = document.getElementById('achievements-back-btn')!;
    this.navigator = new MenuNavigator(input);

    this.backBtn.addEventListener('click', () => this.onBack?.());
  }

  show(onBack: () => void): void {
    this.onBack = onBack;
    this.render();
    this.overlay.classList.remove('hidden');

    this.navigator.activate({
      items: [this.backBtn],
      onConfirm: () => this.onBack?.(),
      onBack: () => this.onBack?.(),
      wrap: false,
    });
  }

  hide(): void {
    this.navigator.deactivate();
    this.overlay.classList.add('hidden');
    this.onBack = null;
  }

  update(dt: number): void {
    this.navigator.update(dt);
  }

  private render(): void {
    const unlocked = loadUnlocked();

    let html = '';
    for (const ach of ACHIEVEMENTS) {
      const isUnlocked = !!unlocked[ach.id];
      const cls = isUnlocked ? 'achievement-card unlocked' : 'achievement-card locked';
      const icon = isUnlocked ? ach.icon : '\uD83D\uDD12';
      const name = isUnlocked ? ach.name : ach.name;
      const desc = isUnlocked ? ach.description : '???';

      html += `<div class="${cls}">
        <span class="achievement-icon">${icon}</span>
        <div class="achievement-info">
          <div class="achievement-name">${name}</div>
          <div class="achievement-desc">${desc}</div>
        </div>
      </div>`;
    }

    this.grid.innerHTML = html;
  }
}
