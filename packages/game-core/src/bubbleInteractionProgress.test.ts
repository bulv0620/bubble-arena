import { expect, test } from 'vitest';
import type { RescueParticipant, RescueControl, RescueProgressFrame, TeamId } from '@bubble-arena/shared';
import { BubbleInteractionProgress } from './bubbleInteractionProgress';
const p = (playerId: string, teamId: TeamId, downed = false): RescueParticipant => ({ playerId, teamId, life: { lifeId: 1, revision: downed ? 1 : 0, status: downed ? 'downed' : 'normal' }, position: {x:0,y:1,z:0}, grounded:true, connected:true });
const c = (playerId: string, targetPlayerId: string | null, held = true): RescueControl => ({ playerId,targetPlayerId,held,active:true,move:false,jump:false,fire:false,reload:false,weaponSwitch:false,aim:false });
const actor=p('actor','red'),target=p('target','blue',true);
const frame = (players: readonly RescueParticipant[] = [actor,target], controls: readonly RescueControl[] = [c('actor','target')]): RescueProgressFrame => ({players,controls,damagedPlayerIds:[],matchFinished:false});
test('kick reserves immediately, commits on press for 18 ticks, tolerates nonlethal damage and completes at most once',()=>{
 const rule=new BubbleInteractionProgress();rule.step(0,frame([actor,target],[{...c('actor','target'),move:true}]),()=>true);
 expect(rule.getSnapshot().channels[0]).toMatchObject({kind:'kick',elapsedTicks:1,requiredTicks:18,ready:false});
 expect(rule.complete(0,'actor',()=>true)).toBe(false);
 for(let tick=1;tick<17;tick++) rule.step(tick,{...frame([actor,target],[{...c('actor','target',false),move:true,fire:true}]),damagedPlayerIds:['actor']},()=>true);
 expect(rule.getSnapshot().channels[0].ready).toBe(false);
 rule.step(17,frame([actor,target],[c('actor','target',false)]),()=>true);expect(rule.getSnapshot().channels[0].ready).toBe(true);
 let count=0;expect(rule.complete(17,'actor',()=>{count++;return true;})).toBe(true);
 expect(rule.complete(17,'actor',()=>{count++;return true;})).toBe(false);expect(count).toBe(1);expect(rule.getSnapshot().channels).toEqual([]);
});
test.each(['downed','eliminated'] as const)('damage that leaves the kicker %s on the completion tick cancels the kick',status=>{
 const rule=new BubbleInteractionProgress();for(let t=0;t<17;t++)rule.step(t,frame(),()=>true);
 rule.step(17,{...frame([{...actor,life:{lifeId:1,revision:1,status}},target]),damagedPlayerIds:['actor']},()=>true);
 expect(rule.getSnapshot().channels).toEqual([]);expect(rule.complete(17,'actor',()=>true)).toBe(false);
});
test('rescue and kick have independent single-owner slots; same-kind contenders cannot stack',()=>{
 const friend=p('z-friend','blue'),otherFriend=p('a-friend','blue'),enemy=p('z-enemy','red'),otherEnemy=p('a-enemy','red');
 const players=[friend,otherFriend,enemy,otherEnemy,target],rule=new BubbleInteractionProgress();
 rule.step(0,frame(players,[c('z-friend','target'),c('a-friend',null,false),c('z-enemy','target'),c('a-enemy',null,false)]),()=>true);
 for(let t=1;t<10;t++)rule.step(t,frame(players,[c('z-friend','target'),c('a-friend','target'),c('z-enemy','target'),c('a-enemy','target')]),()=>true);
 expect(rule.getSnapshot().channels).toHaveLength(2);
 expect(rule.getSnapshot().channels.find(c=>c.kind==='rescue')!.rescuer.playerId).toBe('z-friend');
 expect(rule.getSnapshot().channels.find(c=>c.kind==='kick')!.rescuer.playerId).toBe('z-enemy');
 const simultaneous=new BubbleInteractionProgress();simultaneous.step(0,frame(players,[c('z-friend','target'),c('a-friend','target'),c('z-enemy','target'),c('a-enemy','target')]),()=>true);
 expect(simultaneous.getSnapshot().channels).toHaveLength(2);
 expect(simultaneous.getSnapshot().channels.find(c=>c.kind==='rescue')!.rescuer.playerId).toBe('a-friend');
 expect(simultaneous.getSnapshot().channels.find(c=>c.kind==='kick')!.rescuer.playerId).toBe('a-enemy');
});
test('bubble damage preserves rescue progress; rescuer damage/release and life changes still cancel',()=>{
 const rule=new BubbleInteractionProgress(),friend={...actor,teamId:'blue' as const};
 for(let t=0;t<119;t++)rule.step(t,frame([friend,target]),()=>true);
 expect(rule.getSnapshot().channels[0]).toMatchObject({kind:'rescue',elapsedTicks:119,ready:false});
 rule.step(119,frame([friend,target]),()=>true);expect(rule.getSnapshot().channels[0].ready).toBe(true);
 rule.complete(119,'actor',()=>true);rule.step(120,frame([friend,target],[c('actor','target',false)]),()=>true);
 rule.step(121,frame([friend,target]),()=>true);rule.step(122,{...frame([friend,target]),damagedPlayerIds:['target']},()=>true);
 expect(rule.getSnapshot().channels[0].elapsedTicks).toBe(2);rule.step(123,{...frame([friend,target]),damagedPlayerIds:['actor']},()=>true);expect(rule.getSnapshot().channels).toEqual([]);
 rule.step(124,frame([friend,target]),()=>true);expect(rule.getSnapshot().channels).toEqual([]);
 rule.step(125,frame([friend,target],[c('actor','target',false)]),()=>true);rule.step(126,frame([friend,target]),()=>true);
 rule.step(127,frame([friend,{...target,life:{...target.life,lifeId:2,revision:2}}]),()=>true);expect(rule.getSnapshot().channels).toEqual([]);
});
test('tick replay, gaps, cancellation, finished, range/visibility and invalid query never leave a lock',()=>{
 const rule=new BubbleInteractionProgress();const initial=rule.step(0,frame(),()=>true);
 expect(rule.step(0,frame(),()=>true)).toBe(initial);rule.step(2,frame(),()=>true);expect(rule.getSnapshot().channels).toEqual([]);
 rule.clear();rule.step(0,frame(),()=>true);rule.cancel('actor');expect(rule.getSnapshot().channels).toEqual([]);
 for(const changed of [{...frame(),matchFinished:true},frame([{...actor,position:{x:10,y:1,z:0}},target]),frame([{...actor,connected:false},target])]){
  rule.clear();rule.step(0,frame(),()=>true);rule.step(1,changed,()=>true);expect(rule.getSnapshot().channels).toEqual([]);
 }
 rule.clear();rule.step(0,frame(),()=>true);rule.step(1,frame(),()=>false);expect(rule.getSnapshot().channels).toEqual([]);
 rule.clear();rule.step(0,frame(),()=>true);expect(()=>rule.step(1,frame(),()=>{throw Error('world unavailable');})).toThrow();expect(rule.getSnapshot().channels).toEqual([]);
 rule.clear();rule.step(0,frame(),()=>true);expect(()=>rule.step(1,{...frame(),controls:[c('actor','target'),c('actor','target')]},()=>true)).toThrow();expect(rule.getSnapshot().channels).toEqual([]);
});


test('kick has a 3m reach and still needs map visibility; a completed action releases the opposite slot',()=>{
 const rule=new BubbleInteractionProgress(),friend=p('friend','blue'),kicker={...actor,position:{x:3,y:1,z:0}};
 rule.step(0,frame([friend,kicker,target],[c('friend','target'),c('actor','target')]),()=>true);
 expect(rule.getSnapshot().channels).toHaveLength(2);
 for(let t=1;t<18;t++)rule.step(t,frame([friend,kicker,target],[c('friend','target'),c('actor','target')]),()=>true);
 expect(rule.complete(17,'actor',()=>true)).toBe(true);expect(rule.getSnapshot().channels).toEqual([]);
 const outside=new BubbleInteractionProgress();outside.step(0,frame([{...kicker,position:{x:3.001,y:1,z:0}},target]),()=>true);expect(outside.getSnapshot().channels).toEqual([]);
 const wall=new BubbleInteractionProgress();wall.step(0,frame([kicker,target]),()=>false);expect(wall.getSnapshot().channels).toEqual([]);
});
