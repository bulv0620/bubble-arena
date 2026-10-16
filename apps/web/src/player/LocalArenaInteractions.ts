import { RescueProgress, type PlayerHealthSnapshot, type RescueChannel } from '@bubble-arena/game-core';
import { RESCUE_CONFIG, ARENA_BOT_CONFIG, type DamageActor, type RescuePosition, type RescueParticipant, type RescueControl } from '@bubble-arena/shared';
import type { World } from '@dimforge/rapier3d-compat';
import type { LocalPlayerHealth } from './LocalPlayerHealth';
import type { LocalArenaOpponent } from './LocalArenaOpponent';
import type { LocalLoadout } from '../weapons/LocalLoadout';
import type { LocalTeamScore } from './LocalTeamScore';
import type { RescueInputState } from '../input/RescueInput';
import { isRescueLineClear } from './rescueLineOfSight';
interface InteractiveHealth {
  getSnapshot():PlayerHealthSnapshot;getDamageRevision():number;
  completeRescue(channel:RescueChannel):boolean;finishBubble(fact:{lifeId:number;revision:number},source:DamageActor):boolean;
}
interface Agent {actor:DamageActor;position:RescuePosition;grounded:boolean;health:InteractiveHealth}
export interface ArenaInteractionSnapshot {
  readonly targetId:string|null;readonly kind:'rescue'|'kick'|null;readonly progress:number|null;
  readonly receiving:number|null;readonly kickSequence:number;readonly kickTick:number;readonly kickPosition:RescuePosition|null;
}
const empty=():ArenaInteractionSnapshot=>Object.freeze({targetId:null,kind:null,progress:null,receiving:null,kickSequence:0,kickTick:-1,kickPosition:null});
const position=(p:RescuePosition)=>({x:p.x,y:p.y,z:p.z});
/** Local authority for real combatants; one fixed-step transaction after all damage, before scoring. */
export class LocalArenaInteractions {
  private readonly rule=new RescueProgress();
  private readonly listeners=new Set<()=>void>();
  private readonly damage=new Map<string,number>();
  private readonly aiRest=new Map<string,number>();
  private held=false;private disposed=false;private sequence=0;private state=empty();
  constructor(private readonly player:LocalPlayerHealth,private readonly bots:readonly LocalArenaOpponent[],private readonly loadout:LocalLoadout,private readonly score:LocalTeamScore){}
  getSnapshot=()=>this.state;
  subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn);};};
  private publish(next:ArenaInteractionSnapshot){if(Object.keys(next).every(k=>next[k as keyof ArenaInteractionSnapshot]===this.state[k as keyof ArenaInteractionSnapshot]))return;this.state=Object.freeze(next);for(const fn of this.listeners)fn();}
  cancel=()=>{this.held=false;this.rule.clear();this.loadout.setRescuing(false);this.publish({...this.state,targetId:null,kind:null,progress:null,receiving:null});};
  dispose=()=>{if(this.disposed)return;this.cancel();this.disposed=true;this.damage.clear();this.aiRest.clear();this.listeners.clear();};
  private agents(playerPosition:RescuePosition,grounded:boolean):readonly Agent[]{return [{actor:this.player.actor,position:position(playerPosition),grounded,health:this.player},...this.bots.map(b=>({actor:b.actor,position:b.getPosition(),grounded:b.grounded,health:b}))];}
  private nearest(world:World,self:Agent,agents:readonly Agent[],range:number){
    if(self.health.getSnapshot().status!=='normal')return null;
    return agents.filter(a=>a.actor.playerId!==self.actor.playerId&&a.health.getSnapshot().status==='downed')
      .map(a=>({a,d:Math.hypot(a.position.x-self.position.x,a.position.y-self.position.y,a.position.z-self.position.z)}))
      .filter(e=>e.d<=range&&isRescueLineClear(world,self.position,e.a.position)).sort((a,b)=>a.d-b.d||a.a.actor.playerId.localeCompare(b.a.actor.playerId))[0]?.a??null;
  }
  approachTarget(world:World,bot:LocalArenaOpponent,playerPosition:RescuePosition){const agents=this.agents(playerPosition,true),self=agents.find(a=>a.actor.playerId===bot.actor.playerId)!;return this.nearest(world,self,agents,ARENA_BOT_CONFIG.viewRange)?.position??null;}
  step(world:World,playerPosition:RescuePosition,grounded:boolean,input:RescueInputState){
    if(this.disposed)return;
    if(!this.player.canPlay()){this.cancel();return;}
    const tick=this.player.getTick();if(tick<0)return;
    const agents=this.agents(playerPosition,grounded),self=agents[0],damaged:string[]=[];
    for(const a of agents){const revision=a.health.getDamageRevision();if(revision!==(this.damage.get(a.actor.playerId)??0))damaged.push(a.actor.playerId);this.damage.set(a.actor.playerId,revision);}
    const humanTarget=this.nearest(world,self,agents,RESCUE_CONFIG.maxDistance);
    const pressed=input.active&&input.held&&!this.held;this.held=input.active&&input.held;
    const controls:RescueControl[]=[],players:RescueParticipant[]=agents.map(a=>{const h=a.health.getSnapshot();return {playerId:a.actor.playerId,teamId:a.actor.teamId,life:{status:h.status,lifeId:h.lifeId,revision:h.revision},position:position(a.position),grounded:a.grounded,connected:true};});
    let kickPosition=this.state.kickPosition,kickTick=this.state.kickTick,kickSequence=this.state.kickSequence;
    for(const a of agents){
      const human=a===self,target=human?humanTarget:this.nearest(world,a,agents,RESCUE_CONFIG.maxDistance);
      const active=human?input.active:true,held=human?input.held:tick>=(this.aiRest.get(a.actor.playerId)??0);
      const action=human&&(input.move||input.jump||input.fire||input.reload||input.weaponSwitch||input.aim);
      if(target&&a.grounded&&active&&!action&&(human?pressed:held)&&target.actor.teamId!==a.actor.teamId){
        const h=target.health.getSnapshot();if(target.health.finishBubble({lifeId:h.lifeId,revision:h.revision},a.actor)){kickPosition=Object.freeze(position(target.position));kickTick=tick;kickSequence=++this.sequence;}
      }
      controls.push({playerId:a.actor.playerId,targetPlayerId:target?.actor.teamId===a.actor.teamId?target.actor.playerId:null,held:active&&held,active,
        move:human?input.move:false,jump:human?input.jump:false,fire:human?input.fire:false,reload:human?input.reload:false,weaponSwitch:human?input.weaponSwitch:false,aim:human?input.aim:false});
    }
    // Kicks changed life revisions; rescue must observe those authoritative states.
    players.forEach((p,i)=>{const h=agents[i].health.getSnapshot();players[i]={...p,life:{status:h.status,lifeId:h.lifeId,revision:h.revision}};});
    try{
      const snapshot=this.rule.step(tick,{players,controls,damagedPlayerIds:damaged,matchFinished:false},(a,b)=>isRescueLineClear(world,a,b));
      for(const event of snapshot.events){
        if(event.kind==='interrupted')this.aiRest.set(event.rescuerId,tick+2);
        if(event.kind==='ready')this.rule.complete(tick,event.rescuerId,channel=>{
          const target=agents.find(a=>a.actor.playerId===channel.target.playerId);const accepted=target?.health.completeRescue(channel)??false;
          if(accepted)this.score.recordRescue(channel.rescuer.playerId,channel.target.playerId,channel.target.lifeId,channel.target.revision,tick);return accepted;
        },false);
      }
      const channels=this.rule.getSnapshot().channels,human=channels.find(c=>c.rescuer.playerId===this.player.actor.playerId),receiving=channels.find(c=>c.target.playerId===this.player.actor.playerId);
      this.loadout.setRescuing(Boolean(human));
      this.publish({targetId:humanTarget?.actor.playerId??null,kind:humanTarget?humanTarget.actor.teamId===self.actor.teamId?'rescue':'kick':null,
        progress:human?human.elapsedTicks/human.requiredTicks:null,receiving:receiving?receiving.elapsedTicks/receiving.requiredTicks:null,kickTick,kickSequence,kickPosition});
    }catch(error){this.cancel();throw error;}
  }
}
