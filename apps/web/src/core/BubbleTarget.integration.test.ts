import {beforeAll,expect,test} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {BUBBLE_TRAP_CONFIG,COLLISION_GROUPS} from '@bubble-arena/shared';
import {createTrainingSession} from './trainingSession';
beforeAll(async()=>{await RAPIER.init();});
test('bubble silhouette becomes targetable immediately on downing, costs body damage, and hides its numeric durability feedback',()=>{
 const world=new RAPIER.World({x:0,y:0,z:0}),s=createTrainingSession('rifle',{arena:true}),bot=s.opponent!;
 try{
  const body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0,.92,0));
  const torso=world.createCollider(RAPIER.ColliderDesc.ball(.3).setSensor(true).setCollisionGroups(COLLISION_GROUPS.trainingTarget),body);
  const bubble=world.createCollider(RAPIER.ColliderDesc.ball(BUBBLE_TRAP_CONFIG.radius).setTranslation(0,BUBBLE_TRAP_CONFIG.centerY,0).setSensor(true).setCollisionGroups(COLLISION_GROUPS.trainingTarget),body);
  s.targets.register(torso.handle,bot,'body',()=>bot.getSnapshot().status==='normal');s.targets.register(bubble.handle,bot,'body',()=>bot.getSnapshot().status==='downed');
  world.step();bot.advance(0);
  const ray={origin:{x:.9,y:1,z:5},direction:{x:0,y:0,z:-1},range:30};
  expect(s.targets.aim(world,ray)?.status).toBe('clear');bot.receiveHit({tick:0,sequence:1},100);bot.damageNumbers.clear();
  const aim=s.targets.aim(world,ray)!;expect(aim.colliderHandle).toBe(bubble.handle);expect(s.targets.isRegistered(torso.handle)).toBe(false);
  bot.receiveHit({tick:0,sequence:2},20);expect(bot.getSnapshot().downedHp).toBe(280);expect(bot.damageNumbers.getSnapshot()).toEqual([]);
  bot.advance(1200);expect(bot.getSnapshot().status).toBe('normal');expect(s.targets.isRegistered(bubble.handle)).toBe(false);expect(s.targets.aim(world,ray)?.status).toBe('clear');
 }finally{s.dispose();world.free();}
});
