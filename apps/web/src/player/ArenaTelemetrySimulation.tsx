import { useAfterPhysicsStep, useRapier, type RapierRigidBody } from '@react-three/rapier';
import type { RefObject } from 'react';
import type { CameraHeading } from '@bubble-arena/shared';
import type { LocalPlayerHealth } from './LocalPlayerHealth';
import type { LocalArenaOpponent } from './LocalArenaOpponent';
import type { ArenaTelemetry } from './ArenaTelemetry';
export function ArenaTelemetrySimulation({ player, view, health, bots, telemetry, arena }: {
  player: RefObject<RapierRigidBody | null>; view: RefObject<CameraHeading>; health: LocalPlayerHealth;
  bots: readonly LocalArenaOpponent[]; telemetry: ArenaTelemetry; arena: boolean;
}) {
  const { world } = useRapier();
  useAfterPhysicsStep(() => {
    const position = player.current?.translation(); if (!position || !health.canPlay()) return;
    if (!arena) { telemetry.update(health.getTick(), position); return; }
    telemetry.updateSquad(health.getTick(), world, { id: health.actor.playerId, team: health.actor.teamId, position: { ...position }, yaw: view.current.yaw, status: health.getSnapshot().status },
      bots.map(bot => ({ id: bot.actor.playerId, team: bot.actor.teamId, position: bot.getPosition(), yaw: bot.facingYaw, status: bot.getSnapshot().status })));
  });
  return null;
}
