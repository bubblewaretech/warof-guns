import { Container } from 'pixi.js';
import { World } from '../engine/World.ts';
import { Vec2 } from '../engine/Vec2.ts';
import {
  C,
  type TransformC,
  type VelocityC,
  type BossC,
  type HealthC,
  type BossPhase,
} from '../components/index.ts';
import type { GameState } from '../game/GameState.ts';
import { createProjectile, createEnemy, randomEdgePosition } from '../game/spawner.ts';
import type { EnemiesData } from '../data/types.ts';
import { ARENA_WIDTH, ARENA_HEIGHT } from '../game/constants.ts';

// --- Shared constants ---
const IDLE_DURATION = 1.5;
const CHARGE_DURATION = 1.2;
const CHARGE_SPEED = 400;

// --- Dungeon Lord constants ---
const SPIRAL_DURATION = 3.0;
const SPIRAL_SHOT_INTERVAL = 0.12;
const SPIRAL_PROJECTILE_SPEED = 180;
const SUMMON_COUNT = 4;
const DL_SLAM_DURATION = 1.0;
const DL_SLAM_RADIUS = 120;
const DL_SLAM_DAMAGE = 10;

// --- Inferno Wyrm constants ---
const BREATH_DURATION = 2.5;
const BREATH_SHOT_INTERVAL = 0.08;
const BREATH_SPREAD = 0.5; // radians spread for cone
const BREATH_PROJECTILE_SPEED = 220;
const DASH_TRAIL_DURATION = 2.0;
const DASH_SPEED = 500;
const DASH_TRAIL_SHOT_INTERVAL = 0.1;
const METEOR_DURATION = 2.0;
const METEOR_LAND_TIME = 0.8;
const METEOR_RADIUS = 140;
const METEOR_DAMAGE = 12;
const METEOR_RING_COUNT = 16;

// --- Crystal Golem constants ---
const SHOCKWAVE_DURATION = 2.0;
const SHOCKWAVE_LAND_TIME = 0.5;
const SHOCKWAVE_RING_SPEED = 160;
const SHOCKWAVE_RING_COUNT = 3;
const CRYSTAL_WALL_DURATION = 2.5;
const CRYSTAL_WALL_SUMMON_COUNT = 3;
const LASER_SWEEP_DURATION = 3.0;
const LASER_SHOT_INTERVAL = 0.06;
const LASER_PROJECTILE_SPEED = 300;
const CG_SLAM_DURATION = 1.2;
const CG_SLAM_RADIUS = 150;
const CG_SLAM_DAMAGE = 14;

// Phase orders per boss type
const DL_PHASES: BossPhase[] = ['charge', 'spiral', 'summon', 'slam'];
const IW_PHASES: BossPhase[] = ['flameBreath', 'dashTrail', 'charge', 'meteor'];
const CG_PHASES: BossPhase[] = ['shockwave', 'crystalWall', 'laserSweep', 'slam'];

function getPhaseOrder(boss: BossC): BossPhase[] {
  switch (boss.bossType) {
    case 'infernoWyrm': return IW_PHASES;
    case 'crystalGolem': return CG_PHASES;
    default: return DL_PHASES;
  }
}

export class BossAISystem {
  constructor(
    private world: World,
    private state: GameState,
    private gameLayer: Container,
    private enemies: EnemiesData,
  ) {}

  update(dt: number): void {
    if (this.state.bossId < 0) return;

    const boss = this.world.get<BossC>(this.state.bossId, C.Boss);
    const t = this.world.get<TransformC>(this.state.bossId, C.Transform);
    const v = this.world.get<VelocityC>(this.state.bossId, C.Velocity);
    const hp = this.world.get<HealthC>(this.state.bossId, C.Health);
    if (!boss || !t || !v || !hp) return;

    if (hp.current <= 0) return;

    const bossPos = new Vec2(t.x, t.y);
    const playerPos = this.getNearestAlivePlayerPos(bossPos);
    if (!playerPos) return;

    switch (boss.phase) {
      case 'idle':
        this.runIdle(boss, t, v, playerPos, bossPos, dt);
        break;
      case 'charge':
        this.runCharge(boss, t, v, playerPos, bossPos, dt);
        break;
      case 'spiral':
        this.runSpiral(boss, t, v, playerPos, bossPos, dt);
        break;
      case 'summon':
        this.runSummon(boss, t, v, dt);
        break;
      case 'slam':
        this.runSlam(boss, t, v, playerPos, bossPos, dt);
        break;
      // Inferno Wyrm phases
      case 'flameBreath':
        this.runFlameBreath(boss, t, v, playerPos, bossPos, dt);
        break;
      case 'dashTrail':
        this.runDashTrail(boss, t, v, playerPos, bossPos, dt);
        break;
      case 'meteor':
        this.runMeteor(boss, t, v, playerPos, bossPos, dt);
        break;
      // Crystal Golem phases
      case 'shockwave':
        this.runShockwave(boss, t, v, playerPos, bossPos, dt);
        break;
      case 'crystalWall':
        this.runCrystalWall(boss, t, v, dt);
        break;
      case 'laserSweep':
        this.runLaserSweep(boss, t, v, playerPos, bossPos, dt);
        break;
    }

    // Face nearest player
    const toPlayer = playerPos.sub(bossPos);
    t.rotation = Math.atan2(toPlayer.y, toPlayer.x);
  }

  private getNearestAlivePlayerPos(from: Vec2): Vec2 | null {
    let best: Vec2 | null = null;
    let bestDistSq = Infinity;
    for (const ps of this.state.players) {
      if (!ps.alive) continue;
      const pt = this.world.get<TransformC>(ps.entityId, C.Transform);
      if (!pt) continue;
      const dx = pt.x - from.x;
      const dy = pt.y - from.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        best = new Vec2(pt.x, pt.y);
      }
    }
    return best;
  }

  private nextPhase(boss: BossC): void {
    boss.phase = 'idle';
    boss.idleTimer = IDLE_DURATION;
    boss.phaseCycle++;
  }

  private startPhase(boss: BossC, phase: BossPhase): void {
    boss.phase = phase;
    boss.phaseTimer = 0;
    if (phase === 'spiral') {
      boss.spiralAngle = 0;
      boss.spiralShotTimer = 0;
    }
    if (phase === 'summon') {
      boss.summoned = false;
    }
    if (phase === 'slam') {
      boss.slamLanded = false;
    }
    if (phase === 'flameBreath') {
      boss.breathAngle = 0;
      boss.breathShotTimer = 0;
    }
    if (phase === 'dashTrail') {
      boss.dashCount = 0;
    }
    if (phase === 'meteor') {
      boss.meteorLanded = false;
    }
    if (phase === 'shockwave') {
      boss.shockwaveLanded = false;
    }
    if (phase === 'crystalWall') {
      boss.wallSpawned = false;
    }
    if (phase === 'laserSweep') {
      boss.laserAngle = 0;
      boss.laserShotTimer = 0;
    }
  }

  // ========== SHARED PHASES ==========

  private runIdle(
    boss: BossC, t: TransformC, v: VelocityC,
    playerPos: Vec2, bossPos: Vec2, dt: number,
  ): void {
    boss.idleTimer -= dt;

    const toPlayer = playerPos.sub(bossPos);
    const dist = toPlayer.length();
    if (dist > 80) {
      const dir = toPlayer.normalize();
      v.vx = dir.x * v.maxSpeed * 0.4;
      v.vy = dir.y * v.maxSpeed * 0.4;
    } else {
      v.vx *= 0.9;
      v.vy *= 0.9;
    }

    if (boss.idleTimer <= 0) {
      const phases = getPhaseOrder(boss);
      const phaseIndex = boss.phaseCycle % phases.length;
      this.startPhase(boss, phases[phaseIndex]);
    }
  }

  private runCharge(
    boss: BossC, t: TransformC, v: VelocityC,
    playerPos: Vec2, bossPos: Vec2, dt: number,
  ): void {
    boss.phaseTimer += dt;

    if (boss.phaseTimer < 0.3) {
      v.vx *= 0.5;
      v.vy *= 0.5;
      boss.chargeTargetX = playerPos.x;
      boss.chargeTargetY = playerPos.y;
    } else {
      const target = new Vec2(boss.chargeTargetX, boss.chargeTargetY);
      const toTarget = target.sub(bossPos);
      const dist = toTarget.length();
      if (dist > 20) {
        const dir = toTarget.normalize();
        v.vx = dir.x * CHARGE_SPEED;
        v.vy = dir.y * CHARGE_SPEED;
      }
    }

    if (boss.phaseTimer >= CHARGE_DURATION) {
      v.vx = 0;
      v.vy = 0;
      this.nextPhase(boss);
    }
  }

  // ========== DUNGEON LORD PHASES ==========

  private runSpiral(
    boss: BossC, t: TransformC, v: VelocityC,
    playerPos: Vec2, bossPos: Vec2, dt: number,
  ): void {
    boss.phaseTimer += dt;
    v.vx *= 0.9;
    v.vy *= 0.9;

    boss.spiralShotTimer -= dt;
    if (boss.spiralShotTimer <= 0) {
      boss.spiralShotTimer = SPIRAL_SHOT_INTERVAL;
      boss.spiralAngle += 0.5;

      for (let i = -1; i <= 1; i++) {
        const angle = boss.spiralAngle + i * 0.4;
        const dx = Math.cos(angle) * SPIRAL_PROJECTILE_SPEED;
        const dy = Math.sin(angle) * SPIRAL_PROJECTILE_SPEED;
        createProjectile(
          this.world, this.gameLayer,
          t.x + Math.cos(angle) * 30,
          t.y + Math.sin(angle) * 30,
          dx, dy, 6, 'enemy',
        );
      }
    }

    if (boss.phaseTimer >= SPIRAL_DURATION) {
      this.nextPhase(boss);
    }
  }

  private runSummon(
    boss: BossC, t: TransformC, v: VelocityC, dt: number,
  ): void {
    boss.phaseTimer += dt;
    v.vx *= 0.8;
    v.vy *= 0.8;

    if (!boss.summoned && boss.phaseTimer > 0.5) {
      boss.summoned = true;
      for (let i = 0; i < SUMMON_COUNT; i++) {
        const pos = randomEdgePosition();
        const minionType = i < 2 ? 'meleeGrunt' : 'fastRunner';
        const data = this.enemies[minionType];
        if (data) {
          createEnemy(this.world, this.gameLayer, pos.x, pos.y, data, 1.5);
        }
      }
    }

    if (boss.phaseTimer >= 1.5) {
      this.nextPhase(boss);
    }
  }

  private runSlam(
    boss: BossC, t: TransformC, v: VelocityC,
    playerPos: Vec2, bossPos: Vec2, dt: number,
  ): void {
    boss.phaseTimer += dt;

    // Crystal Golem vs Dungeon Lord slam parameters
    const isCG = boss.bossType === 'crystalGolem';
    const slamDuration = isCG ? CG_SLAM_DURATION : DL_SLAM_DURATION;
    const slamRadius = isCG ? CG_SLAM_RADIUS : DL_SLAM_RADIUS;
    const slamDamage = isCG ? CG_SLAM_DAMAGE : DL_SLAM_DAMAGE;
    const ringCount = isCG ? 16 : 12;
    const ringSpeed = isCG ? 120 : 150;

    if (boss.phaseTimer < 0.4) {
      const toPlayer = playerPos.sub(bossPos);
      const dir = toPlayer.normalize();
      v.vx = dir.x * CHARGE_SPEED * 1.2;
      v.vy = dir.y * CHARGE_SPEED * 1.2;
    } else {
      v.vx *= 0.7;
      v.vy *= 0.7;
    }

    if (!boss.slamLanded && boss.phaseTimer >= 0.5) {
      boss.slamLanded = true;

      for (const ps of this.state.players) {
        if (!ps.alive) continue;
        const pt = this.world.get<TransformC>(ps.entityId, C.Transform);
        if (!pt) continue;
        const pPos = new Vec2(pt.x, pt.y);
        const dist = pPos.sub(bossPos).length();
        if (dist < slamRadius) {
          const playerHp = this.world.get<HealthC>(ps.entityId, C.Health);
          if (playerHp && playerHp.invincibleTimer <= 0) {
            playerHp.current -= slamDamage;
            playerHp.invincibleTimer = 0.5;
            playerHp.flashTimer = 0.12;

            const vel = this.world.get(ps.entityId, C.Velocity) as
              | { vx: number; vy: number }
              | undefined;
            if (vel) {
              const away = pPos.sub(bossPos).normalize();
              vel.vx += away.x * 300;
              vel.vy += away.y * 300;
            }
          }
        }
      }

      for (let i = 0; i < ringCount; i++) {
        const angle = (i / ringCount) * Math.PI * 2;
        createProjectile(
          this.world, this.gameLayer,
          t.x + Math.cos(angle) * 35,
          t.y + Math.sin(angle) * 35,
          Math.cos(angle) * ringSpeed,
          Math.sin(angle) * ringSpeed,
          isCG ? 8 : 4, 'enemy',
        );
      }
    }

    if (boss.phaseTimer >= slamDuration) {
      this.nextPhase(boss);
    }
  }

  // ========== INFERNO WYRM PHASES ==========

  private runFlameBreath(
    boss: BossC, t: TransformC, v: VelocityC,
    playerPos: Vec2, bossPos: Vec2, dt: number,
  ): void {
    boss.phaseTimer += dt;
    v.vx *= 0.85;
    v.vy *= 0.85;

    // Track player with breath angle (slowly)
    const toPlayer = playerPos.sub(bossPos);
    const targetAngle = Math.atan2(toPlayer.y, toPlayer.x);

    // Initialize breath angle on first frame
    if (boss.breathAngle === 0 && boss.phaseTimer < dt * 2) {
      boss.breathAngle = targetAngle;
    }

    // Slowly rotate toward player
    let angleDiff = targetAngle - boss.breathAngle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    boss.breathAngle += angleDiff * 2.0 * dt;

    // Fire cone of flame projectiles
    boss.breathShotTimer -= dt;
    if (boss.breathShotTimer <= 0) {
      boss.breathShotTimer = BREATH_SHOT_INTERVAL;

      for (let i = -2; i <= 2; i++) {
        const angle = boss.breathAngle + i * (BREATH_SPREAD / 4);
        const speed = BREATH_PROJECTILE_SPEED + (Math.random() - 0.5) * 40;
        createProjectile(
          this.world, this.gameLayer,
          t.x + Math.cos(angle) * 35,
          t.y + Math.sin(angle) * 35,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          5, 'enemy',
        );
      }
    }

    if (boss.phaseTimer >= BREATH_DURATION) {
      this.nextPhase(boss);
    }
  }

  private runDashTrail(
    boss: BossC, t: TransformC, v: VelocityC,
    playerPos: Vec2, bossPos: Vec2, dt: number,
  ): void {
    boss.phaseTimer += dt;

    // Rapid dashes that leave fire trail projectiles behind
    const dashInterval = DASH_TRAIL_DURATION / 3;
    const currentDash = Math.floor(boss.phaseTimer / dashInterval);

    if (currentDash > boss.dashCount) {
      boss.dashCount = currentDash;
      // Dash toward player
      boss.chargeTargetX = playerPos.x;
      boss.chargeTargetY = playerPos.y;
    }

    const dashProgress = (boss.phaseTimer % dashInterval) / dashInterval;

    if (dashProgress < 0.2) {
      // Brief wind-up
      v.vx *= 0.5;
      v.vy *= 0.5;
    } else if (dashProgress < 0.7) {
      // Dash
      const target = new Vec2(boss.chargeTargetX, boss.chargeTargetY);
      const toTarget = target.sub(bossPos);
      const dist = toTarget.length();
      if (dist > 20) {
        const dir = toTarget.normalize();
        v.vx = dir.x * DASH_SPEED;
        v.vy = dir.y * DASH_SPEED;
      }

      // Leave fire trail
      boss.breathShotTimer -= dt;
      if (boss.breathShotTimer <= 0) {
        boss.breathShotTimer = DASH_TRAIL_SHOT_INTERVAL;
        // Drop projectile behind
        const trailAngle = Math.atan2(v.vy, v.vx) + Math.PI;
        createProjectile(
          this.world, this.gameLayer,
          t.x, t.y,
          Math.cos(trailAngle) * 60 + (Math.random() - 0.5) * 40,
          Math.sin(trailAngle) * 60 + (Math.random() - 0.5) * 40,
          4, 'enemy',
        );
      }
    } else {
      v.vx *= 0.6;
      v.vy *= 0.6;
    }

    if (boss.phaseTimer >= DASH_TRAIL_DURATION) {
      v.vx = 0;
      v.vy = 0;
      this.nextPhase(boss);
    }
  }

  private runMeteor(
    boss: BossC, t: TransformC, v: VelocityC,
    playerPos: Vec2, bossPos: Vec2, dt: number,
  ): void {
    boss.phaseTimer += dt;

    if (boss.phaseTimer < 0.3) {
      // Jump to center
      const centerX = ARENA_WIDTH / 2;
      const centerY = ARENA_HEIGHT / 2;
      const toCenter = new Vec2(centerX - t.x, centerY - t.y);
      const dist = toCenter.length();
      if (dist > 30) {
        const dir = toCenter.normalize();
        v.vx = dir.x * CHARGE_SPEED * 1.5;
        v.vy = dir.y * CHARGE_SPEED * 1.5;
      }
    } else {
      v.vx *= 0.7;
      v.vy *= 0.7;
    }

    // Meteor impact: AOE damage + fire rain
    if (!boss.meteorLanded && boss.phaseTimer >= METEOR_LAND_TIME) {
      boss.meteorLanded = true;

      // AOE damage to nearby players
      for (const ps of this.state.players) {
        if (!ps.alive) continue;
        const pt = this.world.get<TransformC>(ps.entityId, C.Transform);
        if (!pt) continue;
        const pPos = new Vec2(pt.x, pt.y);
        const dist = pPos.sub(bossPos).length();
        if (dist < METEOR_RADIUS) {
          const playerHp = this.world.get<HealthC>(ps.entityId, C.Health);
          if (playerHp && playerHp.invincibleTimer <= 0) {
            playerHp.current -= METEOR_DAMAGE;
            playerHp.invincibleTimer = 0.5;
            playerHp.flashTimer = 0.15;

            const vel = this.world.get(ps.entityId, C.Velocity) as
              | { vx: number; vy: number }
              | undefined;
            if (vel) {
              const away = pPos.sub(bossPos).normalize();
              vel.vx += away.x * 400;
              vel.vy += away.y * 400;
            }
          }
        }
      }

      // Fire rain: outward ring of projectiles
      for (let i = 0; i < METEOR_RING_COUNT; i++) {
        const angle = (i / METEOR_RING_COUNT) * Math.PI * 2;
        const speed = 130 + Math.random() * 60;
        createProjectile(
          this.world, this.gameLayer,
          t.x + Math.cos(angle) * 30,
          t.y + Math.sin(angle) * 30,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          6, 'enemy',
        );
      }
    }

    if (boss.phaseTimer >= METEOR_DURATION) {
      this.nextPhase(boss);
    }
  }

  // ========== CRYSTAL GOLEM PHASES ==========

  private runShockwave(
    boss: BossC, t: TransformC, v: VelocityC,
    playerPos: Vec2, bossPos: Vec2, dt: number,
  ): void {
    boss.phaseTimer += dt;
    v.vx *= 0.8;
    v.vy *= 0.8;

    // Fire expanding rings of projectiles at intervals
    if (!boss.shockwaveLanded && boss.phaseTimer >= SHOCKWAVE_LAND_TIME) {
      boss.shockwaveLanded = true;

      // Spawn 3 rings with staggered timing
      for (let ring = 0; ring < SHOCKWAVE_RING_COUNT; ring++) {
        const ringProjectiles = 10 + ring * 2;
        const speed = SHOCKWAVE_RING_SPEED + ring * 40;
        const offset = ring * 0.3; // angular offset per ring

        for (let i = 0; i < ringProjectiles; i++) {
          const angle = (i / ringProjectiles) * Math.PI * 2 + offset;
          createProjectile(
            this.world, this.gameLayer,
            t.x + Math.cos(angle) * 30,
            t.y + Math.sin(angle) * 30,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            7, 'enemy',
          );
        }
      }
    }

    if (boss.phaseTimer >= SHOCKWAVE_DURATION) {
      this.nextPhase(boss);
    }
  }

  private runCrystalWall(
    boss: BossC, t: TransformC, v: VelocityC, dt: number,
  ): void {
    boss.phaseTimer += dt;
    v.vx *= 0.8;
    v.vy *= 0.8;

    if (!boss.wallSpawned && boss.phaseTimer > 0.5) {
      boss.wallSpawned = true;

      // Summon shield brutes as "crystal wall" defenders
      for (let i = 0; i < CRYSTAL_WALL_SUMMON_COUNT; i++) {
        const angle = (i / CRYSTAL_WALL_SUMMON_COUNT) * Math.PI * 2;
        const spawnDist = 120;
        const sx = t.x + Math.cos(angle) * spawnDist;
        const sy = t.y + Math.sin(angle) * spawnDist;
        const data = this.enemies['shieldBrute'];
        if (data) {
          createEnemy(this.world, this.gameLayer, sx, sy, data, 1.8);
        }
      }

      // Also fire a burst of slow projectiles outward
      const burstCount = 8;
      for (let i = 0; i < burstCount; i++) {
        const angle = (i / burstCount) * Math.PI * 2;
        createProjectile(
          this.world, this.gameLayer,
          t.x + Math.cos(angle) * 40,
          t.y + Math.sin(angle) * 40,
          Math.cos(angle) * 100,
          Math.sin(angle) * 100,
          6, 'enemy',
        );
      }
    }

    if (boss.phaseTimer >= CRYSTAL_WALL_DURATION) {
      this.nextPhase(boss);
    }
  }

  private runLaserSweep(
    boss: BossC, t: TransformC, v: VelocityC,
    playerPos: Vec2, bossPos: Vec2, dt: number,
  ): void {
    boss.phaseTimer += dt;
    v.vx *= 0.85;
    v.vy *= 0.85;

    // Initialize laser angle toward player on first frame
    if (boss.laserAngle === 0 && boss.phaseTimer < dt * 2) {
      const toPlayer = playerPos.sub(bossPos);
      boss.laserAngle = Math.atan2(toPlayer.y, toPlayer.x);
    }

    // Rotate laser steadily
    boss.laserAngle += 1.8 * dt; // ~103 degrees per second

    // Fire dual beams (opposite directions)
    boss.laserShotTimer -= dt;
    if (boss.laserShotTimer <= 0) {
      boss.laserShotTimer = LASER_SHOT_INTERVAL;

      for (let beam = 0; beam < 2; beam++) {
        const angle = boss.laserAngle + beam * Math.PI;
        createProjectile(
          this.world, this.gameLayer,
          t.x + Math.cos(angle) * 40,
          t.y + Math.sin(angle) * 40,
          Math.cos(angle) * LASER_PROJECTILE_SPEED,
          Math.sin(angle) * LASER_PROJECTILE_SPEED,
          8, 'enemy',
        );
      }
    }

    if (boss.phaseTimer >= LASER_SWEEP_DURATION) {
      this.nextPhase(boss);
    }
  }
}
