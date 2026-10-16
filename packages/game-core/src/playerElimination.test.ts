import { expect, test } from 'vitest';
import { PLAYER_LIFE_CONFIG, RESCUE_PROTECTION_CONFIG, RESPAWN_CONFIG, TRAINING_SCORE_ACTORS as a } from '@bubble-arena/shared';
import { PlayerHealthState } from './playerHealthState';
const hit=(sequence:number,tick:number,lifeId=1)=>({sequence,tick,lifeId});
function down(tick=100){const h=new PlayerHealthState(1,PLAYER_LIFE_CONFIG,RESCUE_PROTECTION_CONFIG,RESPAWN_CONFIG,a.player);h.receiveDamage(hit(1,tick),100,false,a['enemy-a']);return h;}
test('hidden 300 durability requires fifteen separate rifle body hits; finishing happens only once',()=>{
  const h=down();for(let n=1;n<=15;n++){expect(h.receiveDamage(hit(n+1,100),20,false,a['enemy-a'])).toBe(true);expect(h.getSnapshot().downedHp).toBe(300-n*20);}
  expect(h.getSnapshot()).toMatchObject({status:'eliminated',lastDamage:20,lifeId:1,revision:2,respawnSecondsRemaining:5});
  expect(h.receiveDamage(hit(17,101),20,false,a['enemy-a'])).toBe(false);h.advanceTick(400,false);expect(h.getSnapshot().status).toBe('respawning');
});
test('20 seconds deadline returns to same-life 50HP with protection, no elimination fact or respawn countdown',()=>{
  const h=down(),saved=h.getSnapshot();expect(h.advanceTick(159,false)).toBe(false);expect(h.getSnapshot()).toBe(saved);
  h.advanceTick(160,false);expect(h.getSnapshot().downedSecondsRemaining).toBe(19);h.advanceTick(1299,false);expect(h.getSnapshot().status).toBe('downed');
  h.advanceTick(1300,false);expect(h.getSnapshot()).toMatchObject({status:'normal',hp:50,lifeId:1,revision:2,downedHp:0,protected:true,respawnSecondsRemaining:0,eliminationReason:null});
  expect(h.getElimination()).toBeNull();expect(h.getDowner()).toBeNull();expect(h.advanceTick(1299,false)).toBe(false);
});
test('damage does not extend bubble timer; skipped step still recovers without creating points',()=>{
  const h=down();h.receiveDamage(hit(2,1000),20,false,a['enemy-a']);h.advanceTick(1299,false);expect(h.getSnapshot().downedHp).toBe(280);
  h.advanceTick(1301,false);expect(h.getSnapshot()).toMatchObject({status:'normal',hp:50});expect(h.getElimination()).toBeNull();
});
test('deadline wins over same-tick or late finishing gun/kick; an earlier kick can finish',()=>{
  const early=down();expect(early.finishBubble({lifeId:1,revision:1},1299,a['enemy-b'],false)).toBe(true);expect(early.getElimination()?.finisher).toEqual(a['enemy-b']);
  for(const tick of [1300,1301]){const h=down();expect(h.receiveDamage(hit(2,tick),999,false,a['enemy-a'])).toBe(false);expect(h.getSnapshot().status).toBe('normal');expect(h.getElimination()).toBeNull();
    const kick=down();expect(kick.finishBubble({lifeId:1,revision:1},tick,a['enemy-a'],false)).toBe(false);expect(kick.getSnapshot().status).toBe('normal');}
});
test('rescue within 2 seconds and before bubble deadline clears timer; a new episode receives a full deadline',()=>{
  const h=down();expect(h.completeRescue({lifeId:1,revision:1,elapsedTicks:119},219,false)).toBe(false);
  expect(h.completeRescue({lifeId:1,revision:1,elapsedTicks:120},220,false)).toBe(true);h.advanceTick(300,false);
  h.receiveDamage(hit(2,300),100,false,a['enemy-a']);h.advanceTick(1499,false);expect(h.getSnapshot().status).toBe('downed');h.advanceTick(1500,false);expect(h.getSnapshot()).toMatchObject({status:'normal',revision:4,lifeId:1});
});
test('melee rejects allies, stale identities, normal/dead targets, finished and duplicate calls',()=>{
  const h=down(),fact={lifeId:1,revision:1},saved=h.getSnapshot();
  for(const actor of [a.player,a.ally])expect(h.finishBubble(fact,101,actor,false)).toBe(false);
  expect(h.finishBubble({lifeId:1,revision:0},101,a['enemy-a'],false)).toBe(false);expect(h.finishBubble(fact,101,a['enemy-a'],true)).toBe(false);expect(h.getSnapshot()).toBe(saved);
  expect(h.finishBubble(fact,101,a['enemy-a'],false)).toBe(true);expect(h.finishBubble(fact,101,a['enemy-a'],false)).toBe(false);
});
test('invalid damage/old ticks/finished cannot change or postpone timeout; recovery overflow fails before mutation',()=>{
  const h=down(),saved=h.getSnapshot();expect(h.advanceTick(1300,true)).toBe(false);
  for(const bad of [hit(1,101),hit(2,99),hit(2,101,2)])expect(h.receiveDamage(bad,20,false,a['enemy-a'])).toBe(false);
  expect(()=>h.advanceTick(Number.MAX_SAFE_INTEGER,false)).toThrow(RangeError);expect(h.getSnapshot()).toBe(saved);
  h.advanceTick(1300,false);expect(h.getSnapshot().status).toBe('normal');
});
test('configured bubble durations are isolated and round up to physics ticks',()=>{
  const config={...PLAYER_LIFE_CONFIG,downedDuration:1.01,downedHp:75},h=new PlayerHealthState(7,config);config.downedDuration=10;
  h.receiveDamage(hit(1,0,7),100,false);h.advanceTick(60,false);expect(h.getSnapshot()).toMatchObject({status:'downed',downedHp:75});h.advanceTick(61,false);expect(h.getSnapshot()).toMatchObject({status:'normal',hp:50,lifeId:7});
});
