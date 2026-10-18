import { beforeAll, expect, test, vi } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { COLLISION_GROUPS, BLOCK_AVATAR_CONFIG, TRAINING_SCORE_ACTORS as actors } from '@bubble-arena/shared';
import { selectArenaBotTarget, resolveArenaTeamShot, type ArenaCombatant } from './arenaBotCombat';
beforeAll(async()=>{await RAPIER.init();});
const person=(actor: ArenaCombatant['actor'],x:number,z:number,status: ArenaCombatant['status']='normal'): ArenaCombatant=>({actor,position:{x,y:.92,z},status,receive:vi.fn(()=>true)});
test('AI composes wood/person loss, retains protection and ignores allies', () => {
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  try {
    const box = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, 1, -1)); box.userData = { bulletMaterial: 'wood' };
    world.createCollider(RAPIER.ColliderDesc.cuboid(1, 1, .15).setCollisionGroups(COLLISION_GROUPS.map), box);
    const a = person(actors['enemy-a'], 0, -3), b = person(actors['enemy-b'], 0, -6), ally = person(actors.ally, 0, -2);
    const protectedA = { ...a, receive: vi.fn(() => false) }; world.step();
    const trace = resolveArenaTeamShot(world, actors.player, { x: 0, y: a.position.y + BLOCK_AVATAR_CONFIG.bodyY, z: 0 }, { x: 0, y: 0, z: -1 }, [b, ally, protectedA]);
    expect(trace?.hits.map(h => [h.damage, h.accepted])).toEqual([[10, false], [7, true]]);
    expect(b.receive).toHaveBeenCalledWith(7, actors.player); expect(ally.receive).not.toHaveBeenCalled();
    expect(trace?.pellet.contacts).toHaveLength(3); expect(trace?.pellet.hit).toBe(false);
  } finally { world.free(); }
});
test('bots acquire nearest visible enemy, ignore teammates/respawning and respect cover',()=>{
  const world=new RAPIER.World({x:0,y:0,z:0});
  try {
    const hidden=person(actors.player,0,0), visible=person(actors.player,5,1), ally=person(actors['enemy-a'],0,4), dead=person(actors.player,0,5,'respawning');
    world.createCollider(RAPIER.ColliderDesc.cuboid(1,2,.2).setTranslation(0,1,3).setCollisionGroups(COLLISION_GROUPS.map));world.step();
    expect(selectArenaBotTarget(world,actors['enemy-a'],{x:0,y:.92,z:6},[hidden,visible,ally,dead])).toBe(visible);
    expect(selectArenaBotTarget(world,actors['enemy-a'],{x:0,y:.92,z:6},[hidden,ally,dead])).toBeNull();
  }finally{world.free();}
});
test('accepted team shot pierces enemies, attributes source, ignores allies and is clipped by map',()=>{
  const world=new RAPIER.World({x:0,y:0,z:0});
  try {
    const near=person(actors['enemy-a'],0,-3), far=person(actors['enemy-b'],0,-6), friend=person(actors.ally,0,-1);
    const origin={x:0,y:near.position.y+BLOCK_AVATAR_CONFIG.bodyY,z:0}, direction={x:0,y:0,z:-1};world.step();
    const hit=resolveArenaTeamShot(world,actors.player,origin,direction,[far,friend,near]);
    expect(hit?.hits[0]?.victim).toBe(near);expect(near.receive).toHaveBeenCalledWith(20,actors.player);expect(far.receive).toHaveBeenCalledWith(13,actors.player);expect(friend.receive).not.toHaveBeenCalled();
    world.createCollider(RAPIER.ColliderDesc.cuboid(2,3,.2).setTranslation(0,1,-2).setCollisionGroups(COLLISION_GROUPS.map));world.step();
    expect(resolveArenaTeamShot(world,actors.player,origin,direction,[far,near])?.hits).toEqual([]);expect(near.receive).toHaveBeenCalledTimes(1);
  }finally{world.free();}
});

test.each([false,true])('AI bullet stops at a %s allied bubble edge, including the outer shell away from the avatar', allied => {
 const world=new RAPIER.World({x:0,y:0,z:0});
 try {
  const shooter={playerId:'shooter',teamId:'red' as const},damage:number[]=[];
  const bubble={actor:{playerId:'bubble',teamId:allied?'red' as const:'blue' as const},position:{x:0,y:.92,z:0},status:'downed' as const,receive:(d:number)=>{damage.push(d);return true;}};
  const behind={actor:{playerId:'behind',teamId:'blue' as const},position:{x:.9,y:.92,z:-4},status:'normal' as const,receive:()=>{throw Error('bullet passed the bubble');}};
  world.step();const result=resolveArenaTeamShot(world,shooter,{x:.9,y:1,z:5},{x:0,y:0,z:-1},[bubble,behind])!;
  expect(result.pellet.point.z).toBeGreaterThan(0);expect(result.hits).toHaveLength(1);expect(damage).toEqual(allied?[]:[20]);
 }finally{world.free();}
});
