import { beforeAll, expect, test } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { ARENA_SOLIDS, ARENA_SPAWNS, COLLISION_GROUPS, PLAYER_CONFIG, TRAINING_SCORE_ACTORS, parseArenaBotSeats } from '@bubble-arena/shared';
import { createTrainingSession, restartTrainingSession } from './trainingSession';
import { respawnArenaOpponent } from '../player/arenaOpponentRespawn';
import { RapierMovement } from '../player/RapierMovement';
const seats=parseArenaBotSeats([...Array.from({length:3},(_,i)=>({teamId:'red',slot:i+1})),...Array.from({length:4},(_,slot)=>({teamId:'blue',slot}))]);
beforeAll(async()=>{await RAPIER.init();});
test('4v4 uses eight independent lives and real Rapier spawn transactions, scores both teams once and preserves the roster on restart',()=>{
  const world=new RAPIER.World({x:0,y:-20,z:0}), session=createTrainingSession('rifle',{arena:true,botSeats:seats});
  const movement=new RapierMovement(world);
  try {
    world.createCollider(RAPIER.ColliderDesc.cuboid(24,.5,28).setTranslation(0,-.5,0).setCollisionGroups(COLLISION_GROUPS.map));
    for(const s of ARENA_SOLIDS)world.createCollider(RAPIER.ColliderDesc.cuboid(s.size[0]/2,s.size[1]/2,s.size[2]/2).setTranslation(...s.position).setRotation({x:Math.sin(s.rotation[0]/2),y:0,z:0,w:Math.cos(s.rotation[0]/2)}).setCollisionGroups(COLLISION_GROUPS.map));
    const make=(p:{x:number;y:number;z:number})=>{const b=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(p.x,p.y,p.z));world.createCollider(RAPIER.ColliderDesc.capsule(PLAYER_CONFIG.capsuleHalfHeight,PLAYER_CONFIG.radius).setCollisionGroups(COLLISION_GROUPS.player),b);return b;};
    const player=make(ARENA_SPAWNS.points[0].position), bodies=session.bots.map(b=>make(b.spawn));world.step();
    expect(session.score.getSnapshot().players).toHaveLength(8);expect(new Set(session.bots.map(b=>`${b.spawn.x},${b.spawn.z}`)).size).toBe(7);
    session.playerHealth.step();session.bots.forEach(b=>b.advance(0));
    const blue=session.bots.find(b=>b.actor.teamId==='blue')!;
    for(const bot of session.bots){
      const source=bot.actor.teamId==='red'?blue.actor:TRAINING_SCORE_ACTORS.player;
      expect(bot.receiveCombatDamage(100,bot.actor)).toBe(false);
      expect(bot.receiveCombatDamage(100,source)).toBe(true);expect(bot.receiveCombatDamage(300,source)).toBe(true);
    }
    session.score.step(0,session.bots.flatMap(b=>b.drainScoreFacts()),false);
    expect(session.score.getSnapshot().teams).toEqual({red:4,blue:3});
    expect(session.combatLog.getSnapshot()).toHaveLength(6);
    for(let t=1;t<=300;t++){session.playerHealth.step();session.bots.forEach(b=>b.advance(t));}
    const peers=()=>[{playerId:TRAINING_SCORE_ACTORS.player.playerId,team:'red' as const,status:session.playerHealth.getSnapshot().status,position:{...player.translation()}},...session.bots.map(b=>({playerId:b.actor.playerId,team:b.actor.teamId,status:b.getSnapshot().status,position:b.getPosition()}))];
    session.bots.forEach((bot,i)=>{
      expect(respawnArenaOpponent({world,opponent:bot,health:session.playerHealth,body:bodies[i],player,movement,feedback:bot.feedback,others:peers()})).toBe(true);
      expect(bot.getSnapshot()).toMatchObject({status:'normal',hp:100,lifeId:2,protected:true});
      expect(Math.sign(bodies[i].translation().z)).toBe(bot.actor.teamId==='red'?1:-1);
    });
    expect(new Set(session.bots.map(b=>`${b.getPosition().x},${b.getPosition().z}`)).size).toBe(7);
    session.score.step(300,session.bots.flatMap(b=>b.drainScoreFacts()),false);expect(session.score.getSnapshot().teams).toEqual({red:4,blue:3});
    const fresh=restartTrainingSession(session);expect(fresh.botSeats).toEqual(seats);expect(fresh.bots).toHaveLength(7);expect(fresh.score.getSnapshot().teams).toEqual({red:0,blue:0});expect(fresh.bots.every(b=>b.getSnapshot().lifeId===1&&b.getSnapshot().hp===100)).toBe(true);
    expect(session.bots.every(b=>!b.isTargetable())).toBe(true);expect(session.combatLog.getSnapshot()).toEqual([]);fresh.dispose();
  }finally{session.dispose();movement.dispose();world.free();}
});

test('multiple attackers share victim resolved-hit order, preserve downer/finisher and reject duplicate human shots',()=>{
  const session=createTrainingSession('rifle',{arena:true,botSeats:seats});
  try {
    session.playerHealth.step();session.bots.forEach(b=>b.advance(0));
    const victim=session.bots.find(b=>b.actor.teamId==='blue')!, red=session.bots.find(b=>b.actor.teamId==='red')!;
    for(let i=0;i<4;i++) expect(victim.receiveCombatDamage(20,red.actor)).toBe(true);
    expect(victim.receiveHit({tick:0,sequence:1},20)).toBe(true);
    expect(victim.getSnapshot().status).toBe('downed');
    expect(victim.receiveHit({tick:0,sequence:1},300)).toBe(false);
    expect(victim.receiveCombatDamage(300,red.actor)).toBe(true);
    session.score.step(0,victim.drainScoreFacts(),false);
    const scores=session.score.getSnapshot();
    expect(scores.teams).toEqual({red:1,blue:0});
    expect(scores.players.find(p=>p.playerId===red.actor.playerId)?.eliminations).toBe(1);
    expect(scores.players.find(p=>p.playerId===TRAINING_SCORE_ACTORS.player.playerId)?.assists).toBe(1);
  }finally{session.dispose();}
});

test('blue host uses its seat/team for human hits, enemy targeting, score ownership and restart',()=>{
  const playerSeat={teamId:'blue' as const,slot:2},session=createTrainingSession('rifle',{arena:true,playerSeat,botSeats:[{teamId:'red',slot:0},{teamId:'blue',slot:0}]});
  try{
    expect(session.playerHealth.actor.teamId).toBe('blue');session.playerHealth.step();session.bots.forEach(b=>b.advance(0));
    const enemy=session.bots.find(b=>b.actor.teamId==='red')!,ally=session.bots.find(b=>b.actor.teamId==='blue')!;
    expect(enemy.receiveHit({tick:0,sequence:1},100)).toBe(true);expect(ally.receiveHit({tick:0,sequence:1},100)).toBe(false);
    enemy.receiveHit({tick:0,sequence:2},300);session.score.step(0,enemy.drainScoreFacts(),false);expect(session.score.getSnapshot().teams).toEqual({red:0,blue:1});
    expect(session.playerHealth.receiveCombatDamage(20,ally.actor)).toBe(false);expect(session.playerHealth.receiveCombatDamage(20,enemy.actor)).toBe(true);
    const fresh=restartTrainingSession(session);expect(fresh.playerSeat).toEqual(playerSeat);expect(fresh.playerHealth.actor.teamId).toBe('blue');fresh.dispose();
  }finally{session.dispose();}
});
