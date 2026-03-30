# War of Guns

A 2D top-down arena survival game with Zelda-style movement and Brotato-inspired wave combat. Built with TypeScript, PixiJS 7, and Vite.

## How to Run

```bash
npm install
npm run dev
```

Opens at `http://localhost:3000`. No build step needed for development.

### Other Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Type-check + production build |
| `npm run test` | Run unit tests |
| `npm run lint` | ESLint check |
| `npm run format` | Prettier format |

## Controls

| Key | Action |
|-----|--------|
| WASD / Arrow Keys | Move |
| Mouse | Aim |
| Left Mouse Button | Shoot (gun) |
| Right Mouse Button / Space | Melee swing |
| Esc | Pause / Resume |

## Architecture Overview

```
src/
  engine/        Core framework (ECS World, GameLoop, Input, Vec2)
  components/    Component type definitions (Transform, Health, etc.)
  systems/       Game systems (InputSystem, CombatSystem, WaveSystem, etc.)
  game/          Game state, rules (pure functions), entity spawner, constants
  ui/            HUD (PixiJS), overlays (HTML/CSS) for Shop, Pause, LevelUp
  data/          JSON configs for weapons, enemies, waves + TypeScript types
  sfx.ts         Sound effect stubs
  main.ts        Entry point and orchestration
tests/           Unit tests for pure game logic
```

### ECS Design

- **Entities** are numeric IDs managed by `World`.
- **Components** are plain data objects stored in per-key `Map<Entity, T>`.
- **Systems** are classes with `update(dt)` methods that query entities by component keys.
- Entity destruction is deferred (`markDestroy` + `flushDestroy`) to avoid mutation during iteration.

### Key Systems

| System | Responsibility |
|--------|---------------|
| InputSystem | WASD movement, mouse aim, shoot/melee triggers |
| MovementSystem | Velocity integration, friction, arena clamping |
| CombatSystem | Gun firing (projectile creation), melee arc check + damage |
| EnemyAISystem | Melee chase, ranged kiting + periodic shooting |
| WaveSystem | Spawn scheduling, wave completion detection |
| CollisionSystem | Circle-circle overlap: bullets vs enemies, enemies vs player |
| ProjectileSystem | Lifetime countdown, out-of-bounds cleanup |
| HealthSystem | Death detection, XP/money awards, level-up trigger |
| RenderSystem | Sprite position sync, hit flash, melee swing arc visual |

### Data-Driven Content

All weapons, enemies, and wave configs are in `src/data/*.json`. Adding new content requires no code changes — just add entries to the JSON files and reference them in wave configs.

### Game Flow

```
Playing → (all enemies dead) → Level-Up (if pending) → Shop → Next Wave
                                         ↑                       |
                                         └───────────────────────┘
Esc toggles Pause from any gameplay state.
Player death → Game Over → Restart.
```

## Gameplay

- **HP is fixed at 25** — it never increases. Player heals to full between waves.
- **Level-ups upgrade weapons**, not the player. Choose gun or melee upgrade on level-up.
- **Guns use ammo** — buy more in the shop or switch to a different gun.
- **Melee has cooldown** and hits enemies in an arc in front of the player.
- **Shop** between waves: buy new weapons, buy ammo, swap equipment.
- Enemies spawn from arena edges. Melee types rush; ranged types kite and shoot.

## Next Steps

- **Animations**: Sprite sheets for player, enemies, and attacks
- **More weapons**: Rocket launcher, laser, spear, etc.
- **Boss waves**: Every 5th wave spawns a boss enemy with special patterns
- **Passive upgrades**: Movement speed, pickup range, critical hit chance
- **Particle effects**: Explosions, bullet trails, death particles
- **Sound**: Web Audio API for SFX and background music
- **Gamepad support**: Right stick aiming, trigger shooting
- **Minimap**: Show enemy positions in large arenas
- **Difficulty modes**: Easy/Normal/Hard with different scaling
- **Persistent progression**: Unlock new starting weapons across runs
- **Mobile support**: Touch controls with virtual joystick
