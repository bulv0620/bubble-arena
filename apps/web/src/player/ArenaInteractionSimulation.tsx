import { useEffect, type RefObject } from 'react';
import { useThree } from '@react-three/fiber';
import { useAfterPhysicsStep, useRapier, type RapierRigidBody } from '@react-three/rapier';
import type { LocalArenaInteractions } from './LocalArenaInteractions';
import type { RescueInput } from '../input/RescueInput';
import type { PointerLockInput } from '../camera';
import type { AimInput } from '../input';
export function ArenaInteractionSimulation({interaction,input,body,grounded,enabled,pointer,aim}:{interaction:LocalArenaInteractions;input:RescueInput;body:RefObject<RapierRigidBody|null>;grounded:RefObject<boolean>;enabled:()=>boolean;pointer:PointerLockInput;aim:AimInput}){
  const {world}=useRapier(),canvas=useThree(s=>s.gl.domElement);
  useEffect(()=>input.attach(canvas,window,document,enabled,interaction.cancel,()=>pointer.getSnapshot()==='locked'||aim.getSnapshot()),[input,canvas,enabled,interaction,pointer,aim]);
  useEffect(()=>()=>{input.clear();interaction.cancel();},[input,interaction]);
  useAfterPhysicsStep(()=>{const p=body.current?.translation();if(!p){interaction.cancel();return;}interaction.step(world,p,grounded.current,input.consume());});
  return null;
}
