import { useEffect, type RefObject } from 'react';
import { useThree } from '@react-three/fiber';
import { useAfterPhysicsStep, useRapier, type RapierRigidBody } from '@react-three/rapier';
import type { LocalRescuePractice } from './LocalRescuePractice';
import type { RescueInput } from '../input/RescueInput';
import type { PointerLockInput } from '../camera';
import type { AimInput } from '../input';
export function RescueSimulation({ practice, input, body, grounded, enabled, pointer, aim }: {
  practice: LocalRescuePractice; input: RescueInput; body: RefObject<RapierRigidBody | null>; grounded: RefObject<boolean>;
  enabled: () => boolean; pointer: PointerLockInput; aim: AimInput;
}) {
  const { world } = useRapier(), canvas = useThree(state => state.gl.domElement);
  useEffect(() => input.attach(canvas, window, document, enabled, practice.cancel, () => pointer.getSnapshot() === 'locked' || aim.getSnapshot()), [input, canvas, enabled, practice, pointer, aim]);
  useEffect(() => () => { input.clear(); practice.dispose(); }, [input, practice]);
  useAfterPhysicsStep(() => {
    const position = body.current?.translation(); if (!position) { practice.cancel(); return; }
    const state = practice.step(world, position, grounded.current, input.consume());
    if (import.meta.env.DEV && (state.events.length || state.channels.some(c => c.elapsedTicks === 1 || c.elapsedTicks % 30 === 0 && !c.ready))) {
      console.info('[rescue.check]', JSON.stringify({ ...state, position, mode: practice.getSnapshot().mode }));
    }
  });
  return null;
}
