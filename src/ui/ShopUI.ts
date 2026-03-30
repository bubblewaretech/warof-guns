import type { GameState, PlayerState, WeaponInstance } from '../game/GameState.ts';
import type { WeaponsData } from '../data/types.ts';
import { canBuyWeapon, canBuyAmmo, getGunStats } from '../game/rules.ts';
import { PLAYER_MAX_HP } from '../game/constants.ts';
import { SFX } from '../sfx.ts';
import { World } from '../engine/World.ts';
import { C, type HealthC } from '../components/index.ts';
import type { Input, MenuInputSource } from '../engine/Input.ts';
import { MenuNavigator } from './MenuNavigator.ts';

const PLAYER_COLORS = ['#44ff44', '#4488ff'];

interface ShopPanel {
  playerIndex: number;
  navigator: MenuNavigator;
  container: HTMLElement;
  moneySpan: HTMLElement;
  gunsDiv: HTMLElement;
  meleeDiv: HTMLElement;
  ammoDiv: HTMLElement;
  infoDiv: HTMLElement;
  readyBtn: HTMLElement;
  navItems: HTMLElement[];
  ready: boolean;
}

export class ShopUI {
  private overlay: HTMLElement;
  private onStartWave: (() => void) | null = null;
  private panels: ShopPanel[] = [];
  private input: Input;

  constructor(
    private state: GameState,
    private weapons: WeaponsData,
    private world: World,
    input: Input,
  ) {
    this.overlay = document.getElementById('shop-overlay')!;
    this.input = input;
  }

  show(onStartWave: () => void): void {
    this.onStartWave = onStartWave;
    this.panels = [];
    this.overlay.innerHTML = '';

    const playerCount = this.state.players.length;
    const isCoop = playerCount > 1;

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
      const panel = this.buildPanel(i, isCoop);
      container.appendChild(panel.container);
      this.panels.push(panel);
    }

    this.overlay.classList.remove('hidden');

    // Render and activate navigators
    for (const p of this.panels) {
      this.renderPanel(p);
      this.activateNavigator(p);
    }
  }

  hide(): void {
    for (const p of this.panels) {
      p.navigator.deactivate();
    }
    this.panels = [];
    this.overlay.classList.add('hidden');
    this.onStartWave = null;
  }

  update(dt: number): void {
    for (const p of this.panels) {
      if (!p.ready) p.navigator.update(dt);
    }
  }

  /** Reinitialize world reference after game restart. */
  setWorld(w: World): void {
    this.world = w;
  }

  private buildPanel(playerIndex: number, isCoop: boolean): ShopPanel {
    const panel = document.createElement('div');
    panel.className = isCoop
      ? `panel panel-p${playerIndex + 1}`
      : 'panel panel-solo';

    // Header
    const header = document.createElement('h2');
    header.textContent = 'Shop';
    header.style.color = '#ffcc00';
    panel.appendChild(header);

    // Player label
    if (isCoop) {
      const label = document.createElement('div');
      label.className = 'player-label';
      label.textContent = `Player ${playerIndex + 1}`;
      label.style.color = PLAYER_COLORS[playerIndex];
      panel.appendChild(label);
    }

    // Money
    const moneyDiv = document.createElement('div');
    moneyDiv.className = 'money-display';
    const moneySpan = document.createElement('span');
    moneyDiv.textContent = '$';
    moneyDiv.appendChild(moneySpan);
    panel.appendChild(moneyDiv);

    // Shop grid
    const grid = document.createElement('div');
    grid.className = 'shop-grid';

    const gunsSection = document.createElement('div');
    gunsSection.className = 'shop-section';
    gunsSection.innerHTML = '<h3>Guns</h3>';
    const gunsDiv = document.createElement('div');
    gunsSection.appendChild(gunsDiv);

    const meleeSection = document.createElement('div');
    meleeSection.className = 'shop-section';
    meleeSection.innerHTML = '<h3>Melee</h3>';
    const meleeDiv = document.createElement('div');
    meleeSection.appendChild(meleeDiv);

    const ammoSection = document.createElement('div');
    ammoSection.className = 'shop-section';
    ammoSection.innerHTML = '<h3>Ammo</h3>';
    const ammoDiv = document.createElement('div');
    ammoSection.appendChild(ammoDiv);

    const infoSection = document.createElement('div');
    infoSection.className = 'shop-section';
    infoSection.innerHTML = '<h3>Status</h3>';
    const infoDiv = document.createElement('div');
    infoSection.appendChild(infoDiv);

    grid.appendChild(gunsSection);
    grid.appendChild(meleeSection);
    grid.appendChild(ammoSection);
    grid.appendChild(infoSection);
    panel.appendChild(grid);

    // Ready / Start button
    const readyBtn = document.createElement('button');
    readyBtn.textContent = isCoop ? 'Ready' : `Start Wave ${this.state.wave + 1}`;
    panel.appendChild(readyBtn);

    const inputSource: MenuInputSource = playerIndex === 0
      ? this.input.gamepad1
      : this.input.gamepad2;
    const navigator = new MenuNavigator(inputSource);

    const shopPanel: ShopPanel = {
      playerIndex,
      navigator,
      container: panel,
      moneySpan,
      gunsDiv,
      meleeDiv,
      ammoDiv,
      infoDiv,
      readyBtn,
      navItems: [],
      ready: false,
    };

    readyBtn.addEventListener('click', () => this.toggleReady(shopPanel));

    return shopPanel;
  }

  private get isCoop(): boolean {
    return this.state.players.length > 1;
  }

  private toggleReady(panel: ShopPanel): void {
    if (!this.isCoop) {
      // Solo — just start the wave
      const cb = this.onStartWave;
      this.hide();
      if (cb) cb();
      return;
    }

    if (panel.ready) {
      // Un-ready
      panel.ready = false;
      panel.readyBtn.textContent = 'Ready';
      panel.readyBtn.style.opacity = '1';
      // Remove ready badge
      const badge = panel.container.querySelector('.player-ready-badge');
      if (badge) badge.remove();
      // Reactivate navigator
      this.activateNavigator(panel);
    } else {
      // Mark ready
      panel.ready = true;
      panel.navigator.deactivate();
      panel.readyBtn.textContent = 'Waiting...';
      panel.readyBtn.style.opacity = '0.5';

      const badge = document.createElement('div');
      badge.className = 'player-ready-badge';
      badge.textContent = 'Ready!';
      panel.container.appendChild(badge);

      // Check if all ready
      if (this.panels.every(p => p.ready)) {
        const cb = this.onStartWave;
        this.hide();
        if (cb) cb();
      }
    }
  }

  private activateNavigator(panel: ShopPanel): void {
    this.collectNavItems(panel);
    panel.navigator.activate({
      items: panel.navItems,
      onConfirm: (index) => {
        panel.navItems[index]?.click();
      },
      wrap: true,
    });
  }

  private collectNavItems(panel: ShopPanel): void {
    panel.navItems = [];
    panel.navItems.push(
      ...(Array.from(panel.gunsDiv.querySelectorAll('.shop-item')) as HTMLElement[]),
    );
    panel.navItems.push(
      ...(Array.from(panel.meleeDiv.querySelectorAll('.shop-item')) as HTMLElement[]),
    );
    panel.navItems.push(
      ...(Array.from(panel.ammoDiv.querySelectorAll('.shop-item')) as HTMLElement[]),
    );
    panel.navItems.push(panel.readyBtn);
  }

  private renderPanel(panel: ShopPanel): void {
    const ps = this.state.players[panel.playerIndex];

    panel.moneySpan.textContent = String(ps.money);

    // ── Guns ──────────────────────────────────────────
    panel.gunsDiv.innerHTML = '';
    const equippedGunIds = ps.guns.map(g => g.id);

    for (const [id, gun] of Object.entries(this.weapons.guns)) {
      const isEquipped = equippedGunIds.includes(id);
      const isOwned = ps.ownedGunIds.includes(id);
      const bankInst = ps.gunBank[id];
      const lvl = bankInst ? bankInst.level : 0;

      const item = document.createElement('div');
      let statusTag = '';
      let cssClass = 'shop-item';

      if (isEquipped) {
        cssClass += ' equipped';
        statusTag = '<span class="item-tag equipped-tag">Equipped</span>';
      } else if (isOwned) {
        cssClass += ' owned';
        statusTag = '<span class="item-tag owned-tag">Owned</span>';
      }

      const lvlLabel = isOwned ? ` <span class="item-level">Lv${lvl}</span>` : '';

      item.className = cssClass;
      item.innerHTML = `
        <span class="item-name">${gun.name}${lvlLabel} ${statusTag}</span>
        <span class="item-price">${isOwned ? '' : (gun.price === 0 ? 'Free' : '$' + gun.price)}</span>
      `;

      if (!isOwned) {
        const result = canBuyWeapon(ps.money, id, 'gun', ps.ownedGunIds, this.weapons);
        if (result.success) {
          item.addEventListener('click', () => this.buyGun(panel, id));
        }
      } else if (isEquipped) {
        if (ps.guns.length > 1) {
          item.addEventListener('click', () => this.unequipGun(panel, id));
        }
      } else if (isOwned && !isEquipped) {
        item.addEventListener('click', () => this.equipGun(panel, id));
      }

      panel.gunsDiv.appendChild(item);
    }

    // ── Melee ─────────────────────────────────────────
    panel.meleeDiv.innerHTML = '';
    for (const [id, melee] of Object.entries(this.weapons.melee)) {
      const isEquipped = ps.melee.id === id;
      const isOwned = ps.ownedMeleeIds.includes(id);
      const bankInst = ps.meleeBank[id];
      const lvl = bankInst ? bankInst.level : 0;

      const item = document.createElement('div');
      let statusTag = '';
      let cssClass = 'shop-item';

      if (isEquipped) {
        cssClass += ' equipped';
        statusTag = '<span class="item-tag equipped-tag">Equipped</span>';
      } else if (isOwned) {
        cssClass += ' owned';
        statusTag = '<span class="item-tag owned-tag">Owned</span>';
      }

      const lvlLabel = isOwned ? ` <span class="item-level">Lv${lvl}</span>` : '';

      item.className = cssClass;
      item.innerHTML = `
        <span class="item-name">${melee.name}${lvlLabel} ${statusTag}</span>
        <span class="item-price">${isOwned ? '' : (melee.price === 0 ? 'Free' : '$' + melee.price)}</span>
      `;

      if (!isOwned) {
        const result = canBuyWeapon(ps.money, id, 'melee', ps.ownedMeleeIds, this.weapons);
        if (result.success) {
          item.addEventListener('click', () => this.buyMelee(panel, id));
        }
      } else if (isOwned && !isEquipped) {
        item.addEventListener('click', () => this.equipMelee(panel, id));
      }

      panel.meleeDiv.appendChild(item);
    }

    // ── Ammo ──────────────────────────────────────────
    panel.ammoDiv.innerHTML = '';
    for (const gun of ps.guns) {
      const gunData = this.weapons.guns[gun.id];
      const gunStats = getGunStats(gun.id, gun.level, this.weapons);
      const ammoResult = canBuyAmmo(
        ps.money,
        gun.id,
        gun.currentAmmo,
        this.weapons,
        gun.level,
      );

      const ammoItem = document.createElement('div');
      ammoItem.className = 'shop-item';
      ammoItem.innerHTML = `
        <span class="item-name">Buy ${gunData.ammoPurchaseAmount} ${gunData.name} Ammo (${gun.currentAmmo}/${gunStats.ammoMax})</span>
        <span class="item-price">$${gunData.ammoPrice}</span>
      `;
      if (ammoResult.success) {
        const gunRef = gun;
        ammoItem.addEventListener('click', () => this.buyAmmo(panel, gunRef));
      }
      panel.ammoDiv.appendChild(ammoItem);
    }

    // ── Info ──────────────────────────────────────────
    panel.infoDiv.innerHTML = `
      <div style="color: #aaa; font-size: 0.9rem; line-height: 1.6;">
        <div>HP: ${this.world.get<HealthC>(ps.entityId, C.Health)?.current ?? 0}/${PLAYER_MAX_HP}</div>
        <div>Level: ${ps.level}</div>
        <div>Wave ${this.state.wave} Complete</div>
      </div>
    `;

    // Refresh navigator items after re-render
    this.collectNavItems(panel);
    panel.navigator.refreshItems(panel.navItems);
  }

  private buyGun(panel: ShopPanel, id: string): void {
    const ps = this.state.players[panel.playerIndex];
    const gun = this.weapons.guns[id];
    ps.money -= gun.price;
    ps.ownedGunIds.push(id);

    const stats = getGunStats(id, 0, this.weapons);
    const newWeapon: WeaponInstance = { id, level: 0, currentAmmo: stats.ammoMax };
    ps.gunBank[id] = newWeapon;

    if (ps.guns.length < 2) {
      ps.guns.push(newWeapon);
    } else {
      ps.guns[ps.activeGunIndex] = newWeapon;
    }

    SFX.purchase();
    this.renderPanel(panel);
  }

  private equipGun(panel: ShopPanel, id: string): void {
    const ps = this.state.players[panel.playerIndex];
    const weapon = ps.gunBank[id];
    if (!weapon) return;

    if (ps.guns.length < 2) {
      ps.guns.push(weapon);
    } else {
      ps.guns[ps.activeGunIndex] = weapon;
    }

    SFX.purchase();
    this.renderPanel(panel);
  }

  private unequipGun(panel: ShopPanel, id: string): void {
    const ps = this.state.players[panel.playerIndex];
    if (ps.guns.length <= 1) return;

    const idx = ps.guns.findIndex(g => g.id === id);
    if (idx < 0) return;

    ps.guns.splice(idx, 1);
    if (ps.activeGunIndex >= ps.guns.length) {
      ps.activeGunIndex = 0;
    }

    SFX.purchase();
    this.renderPanel(panel);
  }

  private buyMelee(panel: ShopPanel, id: string): void {
    const ps = this.state.players[panel.playerIndex];
    const melee = this.weapons.melee[id];
    ps.money -= melee.price;
    ps.ownedMeleeIds.push(id);
    const newMelee: WeaponInstance = { id, level: 0, currentAmmo: -1 };
    ps.meleeBank[id] = newMelee;
    ps.melee = newMelee;
    SFX.purchase();
    this.renderPanel(panel);
  }

  private equipMelee(panel: ShopPanel, id: string): void {
    const ps = this.state.players[panel.playerIndex];
    const weapon = ps.meleeBank[id];
    if (!weapon) return;
    ps.melee = weapon;
    SFX.purchase();
    this.renderPanel(panel);
  }

  private buyAmmo(panel: ShopPanel, gun: WeaponInstance): void {
    const ps = this.state.players[panel.playerIndex];
    const gunData = this.weapons.guns[gun.id];
    const stats = getGunStats(gun.id, gun.level, this.weapons);
    ps.money -= gunData.ammoPrice;
    gun.currentAmmo = Math.min(
      stats.ammoMax,
      gun.currentAmmo + gunData.ammoPurchaseAmount,
    );
    SFX.purchase();
    this.renderPanel(panel);
  }
}
