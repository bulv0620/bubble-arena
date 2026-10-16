import { beforeAll,expect,test } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { COLLISION_GROUPS } from '@bubble-arena/shared';
import { createTrainingSession } from './trainingSession';
import type { RescueInputState } from '../input/RescueInput';
beforeAll(async()=>{await RAPIER.init();});
const idle:RescueInputState={held:false,active:true,move:false,jump:false,fire:false,reload:false,weaponSwitch:false,aim:false};
function fixture(){
  const world=new RAPIER.World({x:0,y:0,z:0}),s=createTrainingSession('rifle',{arena:true,botSeats:[{teamId:'red',slot:1},{teamId:'blue',slot:0}]}),ally=s.bots.find(b=>b.actor.teamId==='red')!,enemy=s.bots.find(b=>b.actor.teamId==='blue')!;
  const position={x:0,y:.92,z:0};ally.setPosition({x:0,y:.92,z:-1});enemy.setPosition({x:12,y:.92,z:-12});world.step();
  const step=(input:RescueInputState=idle,grounded=true)=>{s.playerHealth.step();const tick=s.playerHealth.getTick();s.bots.forEach(b=>b.advance(tick));s.interactions.step(world,position,grounded,input);s.score.step(tick,[...s.playerHealth.drainScoreFacts(),...s.bots.flatMap(b=>b.drainScoreFacts())],false);};
  step();return {s,world,ally,enemy,position,step,close:()=>{s.dispose();world.free();}};
}
test('actual teammate rescue takes 120 fresh held ticks, restores same life and awards one rescue without team points',()=>{
  const f=fixture();try{f.ally.receiveCombatDamage(100,f.enemy.actor);f.step();for(let n=0;n<119;n++)f.step({...idle,held:true});
    expect(f.ally.getSnapshot().status).toBe('downed');expect(f.s.interactions.getSnapshot().progress).toBeCloseTo(119/120);expect(f.s.loadout.canOperate()).toBe(false);
    f.step({...idle,held:true});expect(f.ally.getSnapshot()).toMatchObject({status:'normal',hp:50,lifeId:1,protected:true});expect(f.s.loadout.canOperate()).toBe(true);
    expect(f.s.score.getSnapshot().players.find(p=>p.playerId===f.s.playerHealth.actor.playerId)?.rescues).toBe(1);expect(f.s.score.getSnapshot().teams).toEqual({red:0,blue:0});
    for(let n=0;n<120;n++)f.step({...idle,held:true});expect(f.s.score.getSnapshot().players.find(p=>p.playerId===f.s.playerHealth.actor.playerId)?.rescues).toBe(1);
  }finally{f.close();}
});
test('effective damage and weapon/move attempts cancel real channels and require release, range and walls forbid inherited progress',()=>{
  const f=fixture();try{f.ally.receiveCombatDamage(100,f.enemy.actor);f.step();for(let n=0;n<40;n++)f.step({...idle,held:true});
    f.s.playerHealth.receiveCombatDamage(20,f.enemy.actor);f.step({...idle,held:true});expect(f.s.interactions.getSnapshot().progress).toBeNull();
    for(let n=0;n<130;n++)f.step({...idle,held:true});expect(f.ally.getSnapshot().status).toBe('downed');
    f.step();f.step({...idle,held:true});expect(f.s.interactions.getSnapshot().progress).not.toBeNull();f.step({...idle,held:true,weaponSwitch:true});expect(f.s.interactions.getSnapshot().progress).toBeNull();
    f.step();f.position.x=3;f.step({...idle,held:true});expect(f.s.interactions.getSnapshot().progress).toBeNull();f.position.x=0;
    worldWall(f.world);f.step();f.step({...idle,held:true});expect(f.s.interactions.getSnapshot().targetId).toBeNull();
  }finally{f.close();}
});
function worldWall(world:RAPIER.World){world.createCollider(RAPIER.ColliderDesc.cuboid(2,2,.1).setTranslation(0,1,-.5).setCollisionGroups(COLLISION_GROUPS.map));world.step();}
test('E press kicks only an in-range visible enemy bubble, credits actual finisher once and does not depend on 300 durability',()=>{
  const f=fixture();try{f.ally.setPosition({x:12,y:.92,z:12});f.enemy.setPosition({x:0,y:.92,z:-1});f.enemy.receiveCombatDamage(100,f.s.playerHealth.actor);f.step();
    f.step({...idle,held:true},false);expect(f.enemy.getSnapshot().status).toBe('downed');f.step();
    f.step({...idle,held:true});expect(f.enemy.getSnapshot().status).toBe('eliminated');expect(f.s.interactions.getSnapshot().kickSequence).toBe(1);expect(f.s.score.getSnapshot().teams.red).toBe(1);
    f.step({...idle,held:true});expect(f.s.score.getSnapshot().teams.red).toBe(1);
  }finally{f.close();}
});
test('a real AI teammate rescues the human for two seconds; enemy AI can melee finish a nearby human bubble',()=>{
  const f=fixture();try{f.s.playerHealth.receiveCombatDamage(100,f.enemy.actor);f.step();for(let n=0;n<120;n++)f.step();
    expect(f.s.playerHealth.getSnapshot()).toMatchObject({status:'normal',hp:50,lifeId:1});expect(f.s.score.getSnapshot().players.find(p=>p.playerId===f.ally.actor.playerId)?.rescues).toBe(1);
    for(let n=0;n<60;n++)f.step();f.ally.setPosition({x:12,y:.92,z:12});f.enemy.setPosition({x:0,y:.92,z:-1});f.s.playerHealth.receiveCombatDamage(100,f.enemy.actor);f.step();
    expect(f.s.playerHealth.getSnapshot().status).toBe('eliminated');expect(f.s.score.getSnapshot().teams.blue).toBe(1);
    f.s.interactions.cancel();f.s.dispose();f.step({...idle,held:true});expect(f.s.loadout.getSnapshot().rescuing).toBe(false);
  }finally{f.close();}
});
