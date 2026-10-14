import { WHITEBOX_SPAWNS, parseSpawnCatalog, parseSpawnEnemies, parseSpawnTeam, spawnCatalogHash,
  type SpawnCatalog, type SpawnEnemy, type SpawnPoint, type SpawnTeam, type RescuePosition } from '@bubble-arena/shared';
export interface SpawnSelection { readonly point: SpawnPoint; readonly fallback: boolean; readonly nearestEnemyDistance: number | null; readonly catalogHash: string }
/** Authoritative roster/map query only, never client-submitted positions or safety. */
export function selectSpawnPoint(team: SpawnTeam, enemies: readonly SpawnEnemy[], isClear: (position: RescuePosition) => boolean, matchFinished: boolean, catalog: SpawnCatalog = WHITEBOX_SPAWNS): SpawnSelection | null {
  const ownTeam = parseSpawnTeam(team), map = parseSpawnCatalog(catalog), roster = parseSpawnEnemies(enemies);
  if (typeof isClear !== 'function' || typeof matchFinished !== 'boolean') throw new TypeError('Invalid spawn query/gate');
  if (matchFinished) return null;
  const opponents = roster.filter(e => e.team !== ownTeam && (e.status === 'normal' || e.status === 'downed'));
  const own = map.points.filter(p => p.team === ownTeam).sort((a, b) => Number(b.primary) - Number(a.primary) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  let best: SpawnPoint | undefined, bestDistance = -1;
  for (const point of own) {
    const clear = isClear(point.position); if (typeof clear !== 'boolean') throw new TypeError('Expected map clearance boolean'); if (!clear) continue;
    let distance = Infinity;
    for (const enemy of opponents) {
      const d = Math.hypot(point.position.x - enemy.position.x, point.position.y - enemy.position.y, point.position.z - enemy.position.z);
      if (!Number.isFinite(d)) throw new RangeError('Spawn distance overflow'); distance = Math.min(distance, d);
    }
    if (distance > bestDistance) { best = point; bestDistance = distance; }
  }
  // The application revalidates the primary before applying; an invalid map must never place inside geometry.
  return Object.freeze({ point: best ?? own.find(p => p.primary)!, fallback: !best,
    nearestEnemyDistance: best && opponents.length ? bestDistance : null, catalogHash: spawnCatalogHash(map) });
}
