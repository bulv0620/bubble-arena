import { beforeAll, expect, test } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { COLLISION_GROUPS } from '@bubble-arena/shared';
import { inTeamVision, type VisionActor } from './teamVision';
import { ArenaTelemetry } from './ArenaTelemetry';
beforeAll(async()=>{ await RAPIER.init(); });
const human: VisionActor = { id:'you',team:'blue',position:{x:0,y:1,z:0},yaw:0,status:'normal' };
const enemy: VisionActor = { id:'enemy',team:'red',position:{x:0,y:1,z:-8},yaw:0,status:'normal' };
test('current team cone, range, wall, actual player team and life gate hide enemy coordinates',()=>{
  const world = new RAPIER.World({x:0,y:0,z:0});
  try {
    expect(inTeamVision(world,enemy,[human])).toBe(true);
    expect(inTeamVision(world,enemy,[{...human,yaw:Math.PI}])).toBe(false);
    expect(inTeamVision(world,{...enemy,position:{x:0,y:1,z:-33}},[human])).toBe(false);
    expect(inTeamVision(world,enemy,[{...human,status:'eliminated'}])).toBe(false);
    const wall=world.createCollider(RAPIER.ColliderDesc.cuboid(2,3,.2).setTranslation(0,1,-4).setCollisionGroups(COLLISION_GROUPS.map));world.step();
    expect(inTeamVision(world,enemy,[human])).toBe(false);
    const ally: VisionActor={...human,id:'ally',position:{x:0,y:1,z:-10},yaw:Math.PI};
    expect(inTeamVision(world,enemy,[human,ally])).toBe(true);
    const telemetry=new ArenaTelemetry();telemetry.updateSquad(6,world,human,[enemy]);
    expect(telemetry.getSnapshot()).toMatchObject({playerTeam:'blue',actors:[]});
    telemetry.updateSquad(12,world,human,[enemy,ally]); expect(telemetry.getSnapshot().actors).toHaveLength(2);
    telemetry.updateSquad(18,world,human,[enemy,{...ally,yaw:0}]);expect(telemetry.getSnapshot().actors.map(a=>a.id)).toEqual(['ally']);
    world.removeCollider(wall,true);world.step();telemetry.updateSquad(24,world,human,[enemy]);expect(telemetry.getSnapshot().actors).toHaveLength(1);
    telemetry.updateSquad(30,world,human,[{...enemy,status:'respawning'}]);expect(telemetry.getSnapshot().actors).toHaveLength(0);telemetry.dispose();
  }finally{world.free();}
});
