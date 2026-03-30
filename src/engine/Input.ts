import { Vec2 } from './Vec2.ts';

/** Standard gamepad button indices (Xbox / "standard" mapping). */
export const GP = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  LB: 4,
  RB: 5,
  LT: 6,
  RT: 7,
  BACK: 8,
  START: 9,
  L3: 10,
  R3: 11,
  DPAD_UP: 12,
  DPAD_DOWN: 13,
  DPAD_LEFT: 14,
  DPAD_RIGHT: 15,
} as const;

/** Minimal input interface for menu navigation (implemented by both GamepadInput and Input). */
export interface MenuInputSource {
  isGpButtonJustPressed(button: number): boolean;
  isGpButtonDown(button: number): boolean;
  get leftStick(): Vec2;
}

/**
 * Isolated gamepad state for a single controller.
 */
export class GamepadInput implements MenuInputSource {
  private _gamepadIndex: number | null = null;
  private gpButtons = new Map<number, boolean>();
  private gpButtonsJust = new Map<number, boolean>();
  private _leftStick = new Vec2();
  private _rightStick = new Vec2();
  private readonly DEADZONE = 0.2;

  get gamepadIndex(): number | null { return this._gamepadIndex; }
  set gamepadIndex(val: number | null) { this._gamepadIndex = val; }
  get connected(): boolean { return this._gamepadIndex !== null; }
  get leftStick(): Vec2 { return this._leftStick; }
  get rightStick(): Vec2 { return this._rightStick; }

  pollGamepad(): void {
    if (this._gamepadIndex === null) return;
    const gamepads = navigator.getGamepads();
    const gp = gamepads[this._gamepadIndex];
    if (!gp) return;

    for (let i = 0; i < gp.buttons.length; i++) {
      const pressed = gp.buttons[i].pressed;
      const wasPressed = this.gpButtons.get(i) ?? false;
      if (pressed && !wasPressed) {
        this.gpButtonsJust.set(i, true);
      }
      this.gpButtons.set(i, pressed);
    }

    this._leftStick = this.applyDeadzone(gp.axes[0] ?? 0, gp.axes[1] ?? 0);
    this._rightStick = this.applyDeadzone(gp.axes[2] ?? 0, gp.axes[3] ?? 0);
  }

  isGpButtonDown(button: number): boolean {
    return this.gpButtons.get(button) ?? false;
  }

  isGpButtonJustPressed(button: number): boolean {
    return this.gpButtonsJust.get(button) ?? false;
  }

  endFrame(): void {
    this.gpButtonsJust.clear();
  }

  clear(): void {
    this.gpButtons.clear();
    this.gpButtonsJust.clear();
    this._leftStick = new Vec2();
    this._rightStick = new Vec2();
  }

  private applyDeadzone(x: number, y: number): Vec2 {
    const mag = Math.sqrt(x * x + y * y);
    if (mag < this.DEADZONE) return new Vec2();
    const remapped = (mag - this.DEADZONE) / (1 - this.DEADZONE);
    return new Vec2((x / mag) * remapped, (y / mag) * remapped);
  }
}

/**
 * Tracks keyboard, mouse, and dual gamepad state.
 * Call pollGamepads() at the START of each tick, and endFrame() at the END.
 */
export class Input implements MenuInputSource {
  // Keyboard
  private keys = new Set<string>();
  private keysJust = new Set<string>();

  // Mouse
  private mouseButtons = new Set<number>();
  private mouseJust = new Set<number>();
  private _mousePos = new Vec2();
  private _canvasRect: DOMRect;

  // Dual gamepads
  readonly gamepad1 = new GamepadInput();
  readonly gamepad2 = new GamepadInput();

  constructor(private canvas: HTMLCanvasElement) {
    this._canvasRect = canvas.getBoundingClientRect();

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' || e.code === 'Space') e.preventDefault();
      if (!this.keys.has(e.code)) this.keysJust.add(e.code);
      this.keys.add(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    canvas.addEventListener('mousemove', (e) => {
      this._canvasRect = canvas.getBoundingClientRect();
      this._mousePos = new Vec2(
        e.clientX - this._canvasRect.left,
        e.clientY - this._canvasRect.top,
      );
    });

    canvas.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.mouseButtons.add(e.button);
      this.mouseJust.add(e.button);
    });

    canvas.addEventListener('mouseup', (e) => {
      this.mouseButtons.delete(e.button);
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Gamepad connect / disconnect — FIFO assignment to pad1 then pad2
    window.addEventListener('gamepadconnected', (e: GamepadEvent) => {
      if (this.gamepad1.gamepadIndex === null) {
        this.gamepad1.gamepadIndex = e.gamepad.index;
      } else if (
        this.gamepad2.gamepadIndex === null &&
        e.gamepad.index !== this.gamepad1.gamepadIndex
      ) {
        this.gamepad2.gamepadIndex = e.gamepad.index;
      }
    });

    window.addEventListener('gamepaddisconnected', (e: GamepadEvent) => {
      if (this.gamepad1.gamepadIndex === e.gamepad.index) {
        this.gamepad1.gamepadIndex = null;
        this.gamepad1.clear();
      } else if (this.gamepad2.gamepadIndex === e.gamepad.index) {
        this.gamepad2.gamepadIndex = null;
        this.gamepad2.clear();
      }
    });

    // Clear state on blur so held keys/buttons don't stick
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseButtons.clear();
      this.gamepad1.clear();
      this.gamepad2.clear();
    });
  }

  // ── Gamepad Polling ──────────────────────────────────────────

  /** Call at the START of each frame, before any systems read input. */
  pollGamepads(): void {
    this.gamepad1.pollGamepad();
    this.gamepad2.pollGamepad();
  }

  // ── Keyboard ─────────────────────────────────────────────────

  isKeyDown(code: string): boolean {
    return this.keys.has(code);
  }

  isKeyJustPressed(code: string): boolean {
    return this.keysJust.has(code);
  }

  // ── Mouse ────────────────────────────────────────────────────

  isMouseDown(button: number): boolean {
    return this.mouseButtons.has(button);
  }

  isMouseJustPressed(button: number): boolean {
    return this.mouseJust.has(button);
  }

  /** Mouse position in canvas-local coordinates. */
  get mousePos(): Vec2 {
    return this._mousePos;
  }

  // ── Backward-compatible gamepad getters (delegate to gamepad1) ──

  get gamepadConnected(): boolean {
    return this.gamepad1.connected;
  }

  get leftStick(): Vec2 {
    return this.gamepad1.leftStick;
  }

  get rightStick(): Vec2 {
    return this.gamepad1.rightStick;
  }

  isGpButtonDown(button: number): boolean {
    return this.gamepad1.isGpButtonDown(button) || this.gamepad2.isGpButtonDown(button);
  }

  isGpButtonJustPressed(button: number): boolean {
    return this.gamepad1.isGpButtonJustPressed(button) || this.gamepad2.isGpButtonJustPressed(button);
  }

  // ── Frame Lifecycle ──────────────────────────────────────────

  /** Call at end of every frame to clear "just pressed" flags. */
  endFrame(): void {
    this.keysJust.clear();
    this.mouseJust.clear();
    this.gamepad1.endFrame();
    this.gamepad2.endFrame();
  }
}
