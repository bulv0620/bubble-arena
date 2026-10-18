import {beforeAll,expect,test} from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {BUBBLE_TRAP_CONFIG,COLLISION_GROUPS,WEAPON_HANDLING,type WeaponId} from '@bubble-arena/shared';
import {createTrainingSession} from './trainingSession';
beforeAll(async()=>{await RAPIER.init();});
test('bubble silhouette becomes targetable immediately on downing, costs body damage, and hides its numeric durability feedback',()=>{
 const world=new RAPIER.World({x:0,y:0,z:0}),s=createTrainingSession('rifle',{arena:true}),bot=s.opponent!;
 try{
  const body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0,.92,0));
  const torso=world.createCollider(RAPIER.ColliderDesc.ball(.3).setSensor(true).setCollisionGroups(COLLISION_GROUPS.trainingTarget),body);
  const bubble=world.createCollider(RAPIER.ColliderDesc.ball(BUBBLE_TRAP_CONFIG.radius).setTranslation(0,BUBBLE_TRAP_CONFIG.centerY,0).setSensor(true).setCollisionGroups(COLLISION_GROUPS.trainingTarget),body);
  s.targets.register(torso.handle,bot,'body',()=>bot.getSnapshot().status==='normal');s.targets.register(bubble.handle,bot,'body',()=>bot.getSnapshot().status==='downed','bubble');
  world.step();bot.advance(0);
  const ray={origin:{x:.9,y:1,z:5},direction:{x:0,y:0,z:-1},range:30};
  expect(s.targets.aim(world,ray)?.status).toBe('clear');bot.receiveHit({tick:0,sequence:1},100);bot.damageNumbers.clear();
  const aim=s.targets.aim(world,ray)!;expect(aim.colliderHandle).toBe(bubble.handle);expect(s.targets.isRegistered(torso.handle)).toBe(false);
  bot.receiveHit({tick:0,sequence:2},20);expect(bot.getSnapshot().downedHp).toBe(280);expect(bot.damageNumbers.getSnapshot()).toEqual([]);
  bot.advance(1200);expect(bot.getSnapshot().status).toBe('normal');expect(s.targets.isRegistered(bubble.handle)).toBe(false);expect(s.targets.aim(world,ray)?.status).toBe('clear');
 }finally{s.dispose();world.free();}
});


test.each(['rifle','sniper','shotgun'] as const)('%s stops on the full friendly or hostile bubble silhouette, never the person behind it',weapon=>{
 for(const friendly of [false,true]){
  const world=new RAPIER.World({x:0,y:0,z:0}),s=createTrainingSession('rifle',{arena:true,botSeats:friendly?[{teamId:'red',slot:1},{teamId:'blue',slot:0}]:[{teamId:'blue',slot:0},{teamId:'blue',slot:1}]});
  try{
   s.playerHealth.step();s.bots.forEach(b=>b.advance(0));const front=s.bots.find(b=>friendly?b.actor.teamId==='red':b.seat.slot===0)!,back=s.bots.find(b=>b!==front)!;
   front.receiveCombatDamage(100,friendly?back.actor:s.playerHealth.actor);
   const body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0,.92,0));
   const bubble=world.createCollider(RAPIER.ColliderDesc.ball(BUBBLE_TRAP_CONFIG.radius).setTranslation(0,BUBBLE_TRAP_CONFIG.centerY,0).setSensor(true).setCollisionGroups(COLLISION_GROUPS.trainingTarget),body);
   const behind=world.createCollider(RAPIER.ColliderDesc.ball(.3).setTranslation(.9,1,-4).setSensor(true).setCollisionGroups(COLLISION_GROUPS.trainingTarget));
   s.targets.register(bubble.handle,front,'body',()=>front.getSnapshot().status==='downed','bubble');s.targets.register(behind.handle,back,'body');world.step();
   const origin={x:.9,y:1,z:5},direction={x:0,y:0,z:-1},ray={origin,direction,point:{x:.9,y:1,z:-70},distance:70,status:'clear' as const,colliderHandle:null};
   const volley=s.targets.resolveVolley(world,{tick:0,sequence:1},Array.from({length:WEAPON_HANDLING[weapon].pellets},()=>ray),weapon as WeaponId);
   expect(volley.pellets).toHaveLength(WEAPON_HANDLING[weapon].pellets);expect(volley.pellets[0].point.z).toBeGreaterThan(0);
   expect(back.getSnapshot().hp).toBe(100);expect(front.getSnapshot().downedHp).toBe(friendly?300:300-(weapon==='rifle'?20:weapon==='sniper'?80:112));
   expect(front.damageNumbers.getSnapshot().filter(e=>e.damage!==100)).toEqual([]);
  }finally{s.dispose();world.free();}
 }
});
