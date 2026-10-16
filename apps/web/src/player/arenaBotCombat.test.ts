import { beforeAll, expect, test, vi } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { COLLISION_GROUPS, BLOCK_AVATAR_CONFIG, TRAINING_SCORE_ACTORS as actors } from '@bubble-arena/shared';
import { selectArenaBotTarget, resolveArenaTeamShot, type ArenaCombatant } from './arenaBotCombat';
beforeAll(async()=>{await RAPIER.init();});
const person=(actor: ArenaCombatant['actor'],x:number,z:number,status: ArenaCombatant['status']='normal'): ArenaCombatant=>({actor,position:{x,y:.92,z},status,receive:vi.fn(()=>true)});
test('bots acquire nearest visible enemy, ignore teammates/respawning and respect cover',()=>{
  const world=new RAPIER.World({x:0,y:0,z:0});
  try {
    const hidden=person(actors.player,0,0), visible=person(actors.player,5,1), ally=person(actors['enemy-a'],0,4), dead=person(actors.player,0,5,'respawning');
    world.createCollider(RAPIER.ColliderDesc.cuboid(1,2,.2).setTranslation(0,1,3).setCollisionGroups(COLLISION_GROUPS.map));world.step();
    expect(selectArenaBotTarget(world,actors['enemy-a'],{x:0,y:.92,z:6},[hidden,visible,ally,dead])).toBe(visible);
    expect(selectArenaBotTarget(world,actors['enemy-a'],{x:0,y:.92,z:6},[hidden,ally,dead])).toBeNull();
  }finally{world.free();}
});
test('accepted team shot damages nearest enemy only, attributes source, ignores allies and is clipped by map',()=>{
  const world=new RAPIER.World({x:0,y:0,z:0});
  try {
    const near=person(actors['enemy-a'],0,-3), far=person(actors['enemy-b'],0,-6), friend=person(actors.ally,0,-1);
    const origin={x:0,y:near.position.y+BLOCK_AVATAR_CONFIG.bodyY,z:0}, direction={x:0,y:0,z:-1};world.step();
    const hit=resolveArenaTeamShot(world,actors.player,origin,direction,[far,friend,near]);
    expect(hit?.victim).toBe(near);expect(near.receive).toHaveBeenCalledWith(20,actors.player);expect(far.receive).not.toHaveBeenCalled();expect(friend.receive).not.toHaveBeenCalled();
    world.createCollider(RAPIER.ColliderDesc.cuboid(2,3,.2).setTranslation(0,1,-2).setCollisionGroups(COLLISION_GROUPS.map));world.step();
    expect(resolveArenaTeamShot(world,actors.player,origin,direction,[far,near])).toBeNull();expect(near.receive).toHaveBeenCalledTimes(1);
  }finally{world.free();}
});
