import { World } from '../engine/World.ts';
import { GamepadInput, GP } from '../engine/Input.ts';
import { Vec2 } from '../engine/Vec2.ts';
import { C, type VelocityC, type PlayerC, type TransformC } from '../components/index.ts';
import type { PlayerState } from '../game/GameState.ts';
import { PLAYER_ACCEL } from '../game/constants.ts';

export class InputSystem {
  private lastMoveAngle = 0; // fallback aim when no enemies exist

  constructor(
    private world: World,
    private gamepad: GamepadInput,
    private playerState: PlayerState,
    private _gameLayerOffset: () => { x: number; y: number },
  ) {}

  update(dt: number): void {
    if (!this.playerState.alive) return;

    const pid = this.playerState.entityId;
    const vel = this.world.get<VelocityC>(pid, C.Velocity);
    const player = this.world.get<PlayerC>(pid, C.Player);
    const transform = this.world.get<TransformC>(pid, C.Transform);
    if (!vel || !player || !transform) return;

    // ── Movement: left stick only (dual gamepad mode) ─────────
    const stick = this.gamepad.leftStick;
    const ax = stick.x;
    const ay = stick.y;

    const inputVec = new Vec2(ax, ay);
    const len = inputVec.length();
    if (len > 0) {
      // Keep stick magnitude if <= 1
      const norm = len > 1 ? inputVec.normalize() : inputVec;
      vel.vx += norm.x * PLAYER_ACCEL * dt;
      vel.vy += norm.y * PLAYER_ACCEL * dt;
      // Track movement direction for aim fallback
      this.lastMoveAngle = Math.atan2(norm.y, norm.x);
    }

    // ── Auto-aim: target nearest enemy ───────────────────────
    player.aimAngle = this.computeAutoAim(transform);
  }

  /** Find nearest enemy and aim at it; fall back to last movement direction. */
  private computeAutoAim(transform: TransformC): number {
    let nearestDistSq = Infinity;
    let nearestAngle = this.lastMoveAngle;

    for (const enemy of this.world.query(C.Enemy, C.Transform)) {
      const et = this.world.get<TransformC>(enemy, C.Transform)!;
      const dx = et.x - transform.x;
      const dy = et.y - transform.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < nearestDistSq) {
        nearestDistSq = distSq;
        nearestAngle = Math.atan2(dy, dx);
      }
    }

    return nearestAngle;
  }

  /** Check pause toggle — call regardless of phase. */
  checkPause(): boolean {
    return this.gamepad.isGpButtonJustPressed(GP.START);
  }

  /** Shoot held: gamepad A. */
  get shootHeld(): boolean {
    return this.gamepad.isGpButtonDown(GP.A);
  }

  /** Melee pressed: gamepad B. */
  get meleePressed(): boolean {
    return this.gamepad.isGpButtonJustPressed(GP.B);
  }

  /**
   * Weapon switch: returns target gun index (0 or 1) or -1 if no switch requested.
   * LB → gun 0; RB → gun 1.
   */
  get switchGunIndex(): number {
    if (this.gamepad.isGpButtonJustPressed(GP.LB)) {
      return 0;
    }
    if (this.gamepad.isGpButtonJustPressed(GP.RB)) {
      return 1;
    }
    return -1;
  }
}
