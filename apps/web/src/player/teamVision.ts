import type { World } from '@dimforge/rapier3d-compat';
import { TEAM_VISION_CONFIG as config, type PlayerLifeStatus, type RescuePosition, type TeamId } from '@bubble-arena/shared';
import { isRescueLineClear } from './rescueLineOfSight';
export interface VisionActor { readonly id: string; readonly team: TeamId; readonly position: RescuePosition; readonly yaw: number; readonly status: PlayerLifeStatus }
export function inTeamVision(world: World, target: VisionActor, viewers: readonly VisionActor[]) {
  if (!['normal', 'downed'].includes(target.status)) return false;
  return viewers.some(viewer => {
    if (!['normal', 'downed'].includes(viewer.status) || viewer.team === target.team || !Number.isFinite(viewer.yaw)) return false;
    const dx = target.position.x - viewer.position.x, dz = target.position.z - viewer.position.z, distance = Math.hypot(dx, dz);
    if (distance > config.range || distance > .01 && (-Math.sin(viewer.yaw) * dx - Math.cos(viewer.yaw) * dz) / distance < Math.cos(config.halfAngle)) return false;
    const eye = { x: viewer.position.x, y: viewer.position.y + config.eyeHeight, z: viewer.position.z };
    return [.55, -.25].some(height => isRescueLineClear(world, eye, { x: target.position.x, y: target.position.y + height, z: target.position.z }));
  });
}
