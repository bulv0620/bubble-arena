import { HIT_MAP_CLEARANCE, WEAPON_PENETRATION, isWeaponId, type WeaponId, type HitRegion } from '@bubble-arena/shared';

export type BulletContact<T> = { readonly kind: 'person' | 'bubble'; readonly target: T; readonly region: HitRegion; readonly distance: number }
  | { readonly kind: 'wood' | 'solid'; readonly key: number; readonly distance: number };

/** Authority-owned ray contacts only. No transport, physics engine, DOM or health mutation. */
export function resolveBulletPenetration<T>(weapon: WeaponId, range: number, contacts: readonly BulletContact<T>[]) {
  if (!isWeaponId(weapon) || !Number.isFinite(range) || range <= 0 || !Array.isArray(contacts)
    || contacts.length > 256 || contacts.some(c => !c || !Number.isFinite(c.distance) || c.distance < 0
      || !['person', 'bubble', 'wood', 'solid'].includes(c.kind)
      || ((c.kind === 'person' || c.kind === 'bubble') ? c.target == null || !['head', 'body'].includes(c.region) : !Number.isFinite(c.key)))) {
    throw new TypeError('Invalid authority bullet contacts');
  }
  const profile = WEAPON_PENETRATION[weapon], people = new Set<T>(), wood = new Set<number>();
  const hits: { contact: Extract<BulletContact<T>, { kind: 'person' | 'bubble' }>; multiplier: number }[] = [];
  const impacts: BulletContact<T>[] = [];
  let multiplier = 1, distance = range, stopped = false;
  // Map gets a 1mm safety priority at coincident character/map surfaces.
  const ordered = contacts.filter(c => c.distance <= range).slice().sort((a, b) =>
    (a.distance + (a.kind === 'person' || a.kind === 'bubble' ? HIT_MAP_CLEARANCE : 0)) - (b.distance + (b.kind === 'person' || b.kind === 'bubble' ? HIT_MAP_CLEARANCE : 0)));
  for (const c of ordered) {
    if (c.kind === 'person' || c.kind === 'bubble') {
      if (people.has(c.target)) continue;
      people.add(c.target); impacts.push(c); hits.push({ contact: c, multiplier });
      if (c.kind === 'bubble' || people.size > profile.maxPeople || profile.personRetention === 0) { distance = c.distance; stopped = true; break; }
      multiplier *= profile.personRetention;
    } else {
      if (wood.has(c.key)) continue;
      impacts.push(c);
      if (c.kind === 'solid' || wood.size >= profile.maxWood || profile.woodRetention === 0) { distance = c.distance; stopped = true; break; }
      wood.add(c.key); multiplier *= profile.woodRetention;
    }
  }
  return { hits, impacts, distance, stopped };
}
