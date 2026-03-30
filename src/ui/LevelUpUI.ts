import type { GameState, PlayerState } from '../game/GameState.ts';
import type { WeaponsData } from '../data/types.ts';
import { generateAllUpgradeChoices, type UpgradeChoice } from '../game/rules.ts';
import { SFX } from '../sfx.ts';
import type { Input, MenuInputSource } from '../engine/Input.ts';
import { MenuNavigator } from './MenuNavigator.ts';

const PLAYER_COLORS = ['#44ff44', '#4488ff'];

interface PanelState {
  playerIndex: number;
  navigator: MenuNavigator;
  container: HTMLElement;
  choicesDiv: HTMLElement;
  pointsSpan: HTMLElement;
  doneBtn: HTMLElement;
  choices: UpgradeChoice[];
  done: boolean;
}

export class LevelUpUI {
  private overlay: HTMLElement;
  private onAllDone: (() => void) | null = null;
  private panels: PanelState[] = [];
  private input: Input;

  constructor(
    private state: GameState,
    private weapons: WeaponsData,
    input: Input,
  ) {
    this.overlay = document.getElementById('levelup-overlay')!;
    this.input = input;
  }

  show(onAllDone: () => void): void {
    this.onAllDone = onAllDone;
    this.panels = [];
    this.overlay.innerHTML = '';

    const playerCount = this.state.players.length;
    const isCoop = playerCount > 1;

    // Build split container for co-op, single panel for solo
    const container = document.createElement('div');
    if (isCoop) {
      container.className = 'split-container';
    } else {
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';
      container.style.width = '100%';
      container.style.height = '100%';
    }
    this.overlay.appendChild(container);

    for (let i = 0; i < playerCount; i++) {
      const ps = this.state.players[i];
      const hasPending = ps.pendingLevelUps > 0;

      const panel = document.createElement('div');
      panel.className = isCoop
        ? `panel panel-p${i + 1}`
        : 'panel panel-solo';

      // Header
      const header = document.createElement('h2');
      header.textContent = 'Level Up!';
      header.style.color = '#ffcc00';
      panel.appendChild(header);

      // Player label
      const label = document.createElement('div');
      label.className = 'player-label';
      label.textContent = isCoop ? `Player ${i + 1}` : 'Choose a weapon to upgrade';
      label.style.color = PLAYER_COLORS[i];
      panel.appendChild(label);

      // Points display
      const pointsDiv = document.createElement('div');
      pointsDiv.className = 'points-display';
      const pointsSpan = document.createElement('span');
      pointsSpan.className = 'pts-num';
      pointsDiv.innerHTML = 'Upgrade Points: ';
      pointsDiv.appendChild(pointsSpan);
      panel.appendChild(pointsDiv);

      // Upgrade list
      const choicesDiv = document.createElement('div');
      choicesDiv.className = 'upgrade-list';
      panel.appendChild(choicesDiv);

      // Done button
      const doneBtn = document.createElement('button');
      doneBtn.textContent = 'Done';
      doneBtn.style.marginTop = '8px';
      panel.appendChild(doneBtn);

      container.appendChild(panel);

      const inputSource: MenuInputSource = i === 0 ? this.input.gamepad1 : this.input.gamepad2;
      const navigator = new MenuNavigator(inputSource);

      const panelState: PanelState = {
        playerIndex: i,
        navigator,
        container: panel,
        choicesDiv,
        pointsSpan,
        doneBtn,
        choices: [],
        done: !hasPending,
      };

      this.panels.push(panelState);

      doneBtn.addEventListener('click', () => this.markDone(panelState));

      if (hasPending) {
        this.renderPanel(panelState);
      } else {
        // No pending level-ups — show as done
        choicesDiv.innerHTML = '<div style="color:#888; padding:12px;">No upgrade points</div>';
        pointsSpan.textContent = '0';
        doneBtn.textContent = 'Ready';
        panelState.done = true;
      }
    }

    this.overlay.classList.remove('hidden');

    // Activate navigators for panels that have pending level-ups
    for (const p of this.panels) {
      if (!p.done) this.activateNavigator(p);
    }

    // Check if all are already done (no one had pending level-ups)
    this.checkAllDone();
  }

  hide(): void {
    for (const p of this.panels) {
      p.navigator.deactivate();
    }
    this.panels = [];
    this.overlay.classList.add('hidden');
    this.onAllDone = null;
  }

  update(dt: number): void {
    for (const p of this.panels) {
      if (!p.done) p.navigator.update(dt);
    }
  }

  private renderPanel(panel: PanelState): void {
    const ps = this.state.players[panel.playerIndex];
    panel.pointsSpan.textContent = String(ps.pendingLevelUps);

    // Generate choices for all owned weapons
    panel.choices = generateAllUpgradeChoices(ps, this.weapons);

    panel.choicesDiv.innerHTML = '';

    // Group by type
    const guns = panel.choices.filter(c => c.type === 'gun');
    const melee = panel.choices.filter(c => c.type === 'melee');

    if (guns.length > 0) {
      const gunLabel = document.createElement('div');
      gunLabel.className = 'upgrade-section-label';
      gunLabel.textContent = 'Guns';
      panel.choicesDiv.appendChild(gunLabel);
      for (const choice of guns) {
        panel.choicesDiv.appendChild(this.createCard(choice, ps, panel));
      }
    }

    if (melee.length > 0) {
      const meleeLabel = document.createElement('div');
      meleeLabel.className = 'upgrade-section-label';
      meleeLabel.textContent = 'Melee';
      panel.choicesDiv.appendChild(meleeLabel);
      for (const choice of melee) {
        panel.choicesDiv.appendChild(this.createCard(choice, ps, panel));
      }
    }

    // Update done button text
    const canAffordAny = panel.choices.some(c => c.cost <= ps.pendingLevelUps);
    panel.doneBtn.textContent = canAffordAny ? 'Done (Save Points)' : 'Done';
  }

  private createCard(choice: UpgradeChoice, ps: PlayerState, panel: PanelState): HTMLElement {
    const canAfford = choice.cost <= ps.pendingLevelUps;

    const card = document.createElement('div');
    card.className = `upgrade-card${canAfford ? '' : ' disabled'}`;

    const info = document.createElement('div');
    info.className = 'upgrade-info';
    info.innerHTML = `
      <div class="upgrade-title">${choice.title}</div>
      <div class="upgrade-desc">${choice.description}</div>
    `;

    const costBadge = document.createElement('div');
    costBadge.className = `upgrade-cost ${canAfford ? 'affordable' : 'expensive'}`;
    costBadge.textContent = `${choice.cost} pt${choice.cost > 1 ? 's' : ''}`;

    card.appendChild(info);
    card.appendChild(costBadge);

    if (canAfford) {
      card.addEventListener('click', () => this.selectUpgrade(choice, panel));
    }

    return card;
  }

  private activateNavigator(panel: PanelState): void {
    const items = Array.from(
      panel.choicesDiv.querySelectorAll('.upgrade-card:not(.disabled)'),
    ) as HTMLElement[];
    // Include the done button
    items.push(panel.doneBtn);

    panel.navigator.activate({
      items,
      onConfirm: (index) => {
        if (index < items.length - 1) {
          // It's a weapon card
          const affordableChoices = panel.choices.filter(
            c => c.cost <= this.state.players[panel.playerIndex].pendingLevelUps,
          );
          if (affordableChoices[index]) {
            this.selectUpgrade(affordableChoices[index], panel);
          }
        } else {
          // Done button
          this.markDone(panel);
        }
      },
      wrap: true,
    });
  }

  private selectUpgrade(choice: UpgradeChoice, panel: PanelState): void {
    const ps = this.state.players[panel.playerIndex];
    if (choice.cost > ps.pendingLevelUps) return;

    ps.pendingLevelUps -= choice.cost;
    choice.apply();
    SFX.levelUp();

    // Re-render with updated state
    this.renderPanel(panel);
    this.activateNavigator(panel);

    // Auto-done if no points left or nothing affordable
    const canAffordAny = panel.choices.some(c => c.cost <= ps.pendingLevelUps);
    if (ps.pendingLevelUps <= 0 || !canAffordAny) {
      this.markDone(panel);
    }
  }

  private markDone(panel: PanelState): void {
    if (panel.done) return;
    panel.done = true;
    panel.navigator.deactivate();
    panel.doneBtn.textContent = 'Ready';
    panel.doneBtn.style.opacity = '0.5';

    // Show ready badge
    const badge = document.createElement('div');
    badge.className = 'player-ready-badge';
    badge.textContent = 'Ready!';
    panel.container.appendChild(badge);

    this.checkAllDone();
  }

  private checkAllDone(): void {
    if (this.panels.every(p => p.done)) {
      const callback = this.onAllDone;
      this.hide();
      if (callback) callback();
    }
  }
}
