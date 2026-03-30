export type Entity = number;

/**
 * Lightweight ECS world: entities are numeric IDs, components are stored in
 * per-key Maps for O(1) access.
 */
export class World {
  private nextId = 0;
  private alive = new Set<Entity>();
  private stores = new Map<string, Map<Entity, unknown>>();
  private destroyQueue: Entity[] = [];

  /** Create a new entity and return its ID. */
  spawn(): Entity {
    const id = this.nextId++;
    this.alive.add(id);
    return id;
  }

  /** Attach a component to an entity. Returns the component for chaining. */
  add<T>(entity: Entity, key: string, component: T): T {
    let store = this.stores.get(key);
    if (!store) {
      store = new Map();
      this.stores.set(key, store);
    }
    store.set(entity, component);
    return component;
  }

  /** Get a component from an entity (undefined if missing). */
  get<T>(entity: Entity, key: string): T | undefined {
    return this.stores.get(key)?.get(entity) as T | undefined;
  }

  /** Check if entity has a component. */
  has(entity: Entity, key: string): boolean {
    return this.stores.get(key)?.has(entity) ?? false;
  }

  /** Remove a single component from an entity. */
  remove(entity: Entity, key: string): void {
    this.stores.get(key)?.delete(entity);
  }

  /** Return all living entities that have ALL listed components. */
  query(...keys: string[]): Entity[] {
    const result: Entity[] = [];
    for (const e of this.alive) {
      let match = true;
      for (const k of keys) {
        if (!this.has(e, k)) {
          match = false;
          break;
        }
      }
      if (match) result.push(e);
    }
    return result;
  }

  isAlive(entity: Entity): boolean {
    return this.alive.has(entity);
  }

  /** Queue an entity for end-of-frame destruction. */
  markDestroy(entity: Entity): void {
    this.destroyQueue.push(entity);
  }

  /** Flush the destroy queue. Callback fires once per destroyed entity. */
  flushDestroy(onDestroy?: (entity: Entity) => void): void {
    for (const entity of this.destroyQueue) {
      if (!this.alive.has(entity)) continue;
      onDestroy?.(entity);
      this.alive.delete(entity);
      for (const store of this.stores.values()) {
        store.delete(entity);
      }
    }
    this.destroyQueue = [];
  }

  /** Number of living entities. */
  get count(): number {
    return this.alive.size;
  }

  /** Reset everything. */
  clear(): void {
    this.alive.clear();
    this.stores.clear();
    this.destroyQueue = [];
    this.nextId = 0;
  }
}
