import type { MenuInputSource } from '../engine/Input.ts';
import { GP } from '../engine/Input.ts';

export interface MenuNavigatorConfig {
  items: HTMLElement[];
  onConfirm: (index: number) => void;
  onBack?: () => void;
  wrap?: boolean;
  columns?: number;
}

/**
 * Shared menu navigation for controller / keyboard.
 * Accepts any MenuInputSource (full Input for shared menus, GamepadInput for per-player menus).
 * D-pad or left stick navigates; A confirms; B backs.
 */
export class MenuNavigator {
  private items: HTMLElement[] = [];
  private selectedIndex = 0;
  private active = false;
  private config: MenuNavigatorConfig | null = null;
  private stickCooldown = 0;
  private readonly STICK_REPEAT_DELAY = 0.18;

  constructor(private inputSource: MenuInputSource) {}

  /** Switch the input source (e.g., when changing which player controls the menu). */
  setInputSource(source: MenuInputSource): void {
    this.inputSource = source;
  }

  /** Activate navigation with a new set of items. */
  activate(config: MenuNavigatorConfig): void {
    this.config = config;
    this.items = config.items;
    this.selectedIndex = 0;
    this.active = true;
    this.stickCooldown = 0;
    this.updateHighlight();
  }

  /** Deactivate and remove all highlights. */
  deactivate(): void {
    this.clearHighlight();
    this.active = false;
    this.config = null;
    this.items = [];
  }

  /** Call every frame while the menu is visible. dt in seconds. */
  update(dt: number): void {
    if (!this.active || this.items.length === 0) return;

    this.stickCooldown = Math.max(0, this.stickCooldown - dt);
    const cols = this.config?.columns ?? 1;
    const wrap = this.config?.wrap !== false;

    let moved = false;
    let delta = 0;

    const inp = this.inputSource;
    const keyJust = (code: string) =>
      'isKeyJustPressed' in inp && typeof inp.isKeyJustPressed === 'function'
        ? (inp as { isKeyJustPressed: (c: string) => boolean }).isKeyJustPressed(code)
        : false;

    // D-pad (gamepad) + optional keyboard arrows
    if (
      keyJust('ArrowUp') ||
      inp.isGpButtonJustPressed(GP.DPAD_UP)
    ) {
      delta = -cols;
      moved = true;
    } else if (
      keyJust('ArrowDown') ||
      inp.isGpButtonJustPressed(GP.DPAD_DOWN)
    ) {
      delta = cols;
      moved = true;
    } else if (
      keyJust('ArrowLeft') ||
      inp.isGpButtonJustPressed(GP.DPAD_LEFT)
    ) {
      delta = -1;
      moved = true;
    } else if (
      keyJust('ArrowRight') ||
      inp.isGpButtonJustPressed(GP.DPAD_RIGHT)
    ) {
      delta = 1;
      moved = true;
    }

    // Left stick navigation (with repeat delay to prevent rapid scrolling)
    if (!moved && this.stickCooldown <= 0) {
      const stick = inp.leftStick;
      if (stick.y < -0.5) {
        delta = -cols;
        moved = true;
      } else if (stick.y > 0.5) {
        delta = cols;
        moved = true;
      } else if (stick.x < -0.5) {
        delta = -1;
        moved = true;
      } else if (stick.x > 0.5) {
        delta = 1;
        moved = true;
      }
      if (moved) this.stickCooldown = this.STICK_REPEAT_DELAY;
    }

    if (moved) {
      let newIndex = this.selectedIndex + delta;
      if (wrap) {
        newIndex =
          ((newIndex % this.items.length) + this.items.length) %
          this.items.length;
      } else {
        newIndex = Math.max(0, Math.min(this.items.length - 1, newIndex));
      }
      this.selectedIndex = newIndex;
      this.updateHighlight();
    }

    // Confirm (A button + optional keyboard)
    if (
      inp.isGpButtonJustPressed(GP.A) ||
      keyJust('Enter') ||
      keyJust('Space')
    ) {
      this.config?.onConfirm(this.selectedIndex);
    }

    // Back (B button + optional Escape)
    if (
      inp.isGpButtonJustPressed(GP.B) ||
      keyJust('Escape')
    ) {
      this.config?.onBack?.();
    }
  }

  /** Refresh items after re-render. Preserves selection index if valid. */
  refreshItems(items: HTMLElement[]): void {
    this.clearHighlight();
    this.items = items;
    if (this.selectedIndex >= items.length) {
      this.selectedIndex = Math.max(0, items.length - 1);
    }
    this.updateHighlight();
  }

  private updateHighlight(): void {
    for (let i = 0; i < this.items.length; i++) {
      this.items[i].classList.toggle('menu-focused', i === this.selectedIndex);
    }
    this.items[this.selectedIndex]?.scrollIntoView({ block: 'nearest' });
  }

  private clearHighlight(): void {
    for (const item of this.items) {
      item.classList.remove('menu-focused');
    }
  }
}
