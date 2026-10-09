import { BUBBLE_CONFIG, PHYSICS_CONFIG, WEAPON_CONFIGS } from '@bubble-arena/shared';
interface Vector { readonly x: number; readonly y: number; readonly z: number }
export interface FlyingBubble { readonly sequence: number; readonly position: Vector; readonly direction: Vector; readonly age: number; readonly distance: number }
const finite = (v: Vector) => Boolean(v && [v.x, v.y, v.z].every(Number.isFinite));
/** Bounded fixed-step flight; the authority provides swept collision distance, no render clock. */
export class BubbleFlight {
  private items: readonly FlyingBubble[] = Object.freeze([]);
  private lastSequence = 0;
  getSnapshot = () => this.items;
  spawn(sequence: number, origin: Vector, direction: Vector) {
    if (!Number.isSafeInteger(sequence) || sequence <= 0 || !finite(origin) || !finite(direction)) throw new TypeError('Invalid bubble launch');
    const length = Math.hypot(direction.x, direction.y, direction.z);
    if (!Number.isFinite(length) || length === 0) throw new RangeError('Invalid bubble direction');
    if (sequence <= this.lastSequence || this.items.length >= BUBBLE_CONFIG.capacity) return false;
    this.lastSequence = sequence;
    this.items = Object.freeze([...this.items, Object.freeze({ sequence, position: Object.freeze({ ...origin }),
      direction: Object.freeze({ x: direction.x / length, y: direction.y / length, z: direction.z / length }), age: 0, distance: 0 })]);
    return true;
  }
  step(sweep: (origin: Vector, direction: Vector, distance: number) => number | null,
    explode: (sequence: number, point: Vector) => void) {
    const remaining: FlyingBubble[] = [];
    for (const bubble of this.items) {
      const distance = Math.min(BUBBLE_CONFIG.speed * PHYSICS_CONFIG.timeStep, WEAPON_CONFIGS.bubble.range - bubble.distance);
      const collision = sweep(bubble.position, bubble.direction, distance);
      if (collision !== null && (!Number.isFinite(collision) || collision < 0 || collision > distance)) throw new RangeError('Invalid bubble sweep result');
      const travelled = collision ?? distance;
      const position = Object.freeze({ x: bubble.position.x + bubble.direction.x * travelled,
        y: bubble.position.y + bubble.direction.y * travelled, z: bubble.position.z + bubble.direction.z * travelled });
      const age = bubble.age + 1;
      if (collision !== null) { explode(bubble.sequence, position); continue; }
      if (age >= Math.ceil(BUBBLE_CONFIG.lifetime * PHYSICS_CONFIG.tickRate) || bubble.distance + distance >= WEAPON_CONFIGS.bubble.range - 1e-8) continue;
      remaining.push(Object.freeze({ ...bubble, position, age, distance: bubble.distance + distance }));
    }
    this.items = Object.freeze(remaining);
  }
  clear() { this.items = Object.freeze([]); }
}
