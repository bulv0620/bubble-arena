import { beforeAll, expect, test } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { PerspectiveCamera, Vector3 } from 'three';
import { spreadDirection } from '@bubble-arena/game-core';
import { CAMERA_CONFIG, COLLISION_GROUPS, PLAYER_CONFIG, WEAPON_CONFIGS, WEAPON_IDS } from '@bubble-arena/shared';
import { updateFollowCamera } from '../camera/cameraFollowPose';
import { createScreenAimRay, queryScreenAimTarget } from './screenAimRay';
import { muzzleAimDirection, queryMuzzleRay } from './muzzleRay';
import { rifleMuzzlePosition } from './riflePose';
import { LocalLoadout } from './LocalLoadout';
import { LocalBubbleFlight } from './LocalBubbleFlight';
import { TrainingTargets } from './TrainingTargets';
import { LocalTrainingTarget } from './LocalTrainingTarget';
import { RifleRecoil } from './RifleRecoil';

beforeAll(async()=>{await RAPIER.init();});
const center={x:0,y:PLAYER_CONFIG.height/2,z:0};
function camera(fov=CAMERA_CONFIG.fov,aspect=16/9){
 const view=new PerspectiveCamera(fov,aspect,.1,200);
 updateFollowCamera(view,{translation:()=>center},{yaw:0,pitch:CAMERA_CONFIG.initialPitch},false,fov);
 view.updateMatrixWorld(); return view;
}
function wall(world:RAPIER.World,z:number){return world.createCollider(RAPIER.ColliderDesc.cuboid(20,20,.01).setTranslation(0,1,z).setCollisionGroups(COLLISION_GROUPS.map));}
function pixels(point:{x:number;y:number;z:number},view:PerspectiveCamera){const p=new Vector3().copy(point).project(view);return Math.hypot(p.x*640,p.y*360);}

test.each(WEAPON_IDS)('%s zero-spread hits the reticle at every near/far wall, FOV and aspect',weapon=>{
 const world=new RAPIER.World({x:0,y:0,z:0});
 try{
 const muzzle=rifleMuzzlePosition(center,0,weapon)!;
 for(const fov of [65,24])for(const aspect of [16/9,4/3])for(const z of [-2,-5,-10,-20]){
  const view=camera(fov,aspect),blocker=wall(world,z);world.step();
  const aim=queryScreenAimTarget(world,createScreenAimRay(view,WEAPON_CONFIGS[weapon].range)!)!;
  const result=queryMuzzleRay(world,center,muzzle,aim,WEAPON_CONFIGS[weapon].range)!;
  expect(result.status).toBe('hit');expect(result.colliderHandle).toBe(blocker.handle);
  expect(pixels(result.point,view)).toBeLessThan(.001);
  expect(result.origin).toEqual(muzzle);
  expect(new Vector3().copy(aim.point).sub(muzzle).cross(new Vector3().copy(result.direction)).length()).toBeLessThan(.00001);
  world.removeCollider(blocker,true);
 }
 }finally{world.free();}
});

test('actual settled rifle first shot stays within its small random cone instead of a fixed shoulder offset',()=>{
 const world=new RAPIER.World({x:0,y:0,z:0});
 try{
 wall(world,-5);world.step();const view=camera(),muzzle=rifleMuzzlePosition(center,0)!;
 const aim=queryScreenAimTarget(world,createScreenAimRay(view)!)!;
 const loadout=new LocalLoadout(),shot=loadout.step({held:true,pressed:true})!;
 expect(shot.angle*180/Math.PI).toBeCloseTo(.2);
 const direction=aim.direction;
 for(const radial of [0,.25,.999999])for(const azimuth of [0,.25,.5,.75]){
  const scattered=spreadDirection(direction,shot.angle,radial,azimuth)!;
  expect(scattered).not.toBeNull();
  const sample=queryScreenAimTarget(world,{origin:aim.origin,direction:scattered,range:70})!;
  const result=queryMuzzleRay(world,center,muzzle,sample,70)!;
  expect(pixels(result.point,view)).toBeLessThan(2.1);
 }
 // Reproduce the old zero-spread long-distance convergence: it missed even
 // before random spread or recoil. This regression measures screen accuracy.
 const far=new Vector3().copy(aim.origin).addScaledVector(new Vector3().copy(aim.direction),aim.range);
 const oldDirection=far.sub(muzzle).normalize();
 const oldPoint=new Vector3().copy(muzzle).addScaledVector(oldDirection,(-4.99-muzzle.z)/oldDirection.z);
 expect(pixels(oldPoint,view)).toBeGreaterThan(10);
 }finally{world.free();}
});

test('accepted scoped first shot damages the small sensor under the reticle before recoil/close-scope changes',()=>{
 const world=new RAPIER.World({x:0,y:0,z:0});
 try{
 const registry=new TrainingTargets(),victim=new LocalTrainingTarget(),loadout=new LocalLoadout('sniper');
 const view=camera(24),ray=createScreenAimRay(view,100)!;
 const point=new Vector3().copy(ray.origin).addScaledVector(new Vector3().copy(ray.direction),10);
 const collider=world.createCollider(RAPIER.ColliderDesc.ball(.025).setTranslation(point.x,point.y,point.z).setSensor(true).setCollisionGroups(COLLISION_GROUPS.trainingTarget));
 registry.register(collider.handle,victim,'head');world.step();
 const aim=registry.aim(world,ray)!;expect(aim.colliderHandle).toBe(collider.handle);
 loadout.setScoped(true);const shot=loadout.step({held:true,pressed:true})!;
 expect(shot.angle).toBe(0);expect(loadout.getSnapshot().scoped).toBe(false);
 const recoil=new RifleRecoil();recoil.kick(shot.sequence);
 const muzzle=rifleMuzzlePosition(center,0,'sniper')!;
 const result=queryMuzzleRay(world,center,muzzle,aim,100)!;
 registry.resolveVolley(world,shot,[result],'sniper');
 expect(victim.getSnapshot().hp).toBe(0);
 expect(pixels(aim.point,view)).toBeLessThan(.001);
 }finally{world.free();}
});

test('camera peeking above cover cannot damage a visible reticle sensor through the obstructed gun',()=>{
 const world=new RAPIER.World({x:0,y:0,z:0});
 try{
 const registry=new TrainingTargets(),victim=new LocalTrainingTarget();
 const origin={x:0,y:2,z:0},anchor={x:0,y:1,z:0},muzzle={x:0,y:1,z:-.5};
 const cover=world.createCollider(RAPIER.ColliderDesc.cuboid(1,.7,.1).setTranslation(0,.7,-1).setCollisionGroups(COLLISION_GROUPS.map));
 const sensor=world.createCollider(RAPIER.ColliderDesc.ball(.1).setTranslation(0,2,-5).setSensor(true).setCollisionGroups(COLLISION_GROUPS.trainingTarget));
 registry.register(sensor.handle,victim);world.step();
 const aim=registry.aim(world,{origin,direction:{x:0,y:0,z:-1},range:70})!;
 expect(aim.colliderHandle).toBe(sensor.handle);
 const result=queryMuzzleRay(world,anchor,muzzle,aim)!;
 expect(result.status).toBe('hit');expect(result.aimObstructed).toBe(true);expect(result.colliderHandle).toBe(cover.handle);
 const impact=registry.resolveVolley(world,{tick:0,sequence:1},[result],'rifle');
 expect(impact.pellets).toHaveLength(1);expect(impact.pellets[0].hit).toBe(true);
 expect(victim.getSnapshot().hp).toBe(100);
 }finally{world.free();}
});

test('bubble starts at the physical muzzle and follows the same ray as its collision, without visual correction',()=>{
 const world=new RAPIER.World({x:0,y:0,z:0});
 try{
 const bubbles=new LocalBubbleFlight(new TrainingTargets()),muzzle={x:.4,y:1,z:-.5};
 const aim=queryScreenAimTarget(world,{origin:{x:.8,y:2,z:0},direction:{x:0,y:-.1,z:-1},range:40})!;
 const direction=muzzleAimDirection(muzzle,aim)!;
 expect(bubbles.flight.spawn(1,muzzle,direction)).toBe(true);
 const initial=bubbles.flight.getSnapshot()[0];expect(initial.position).toEqual(muzzle);
 expect(bubbles.flight.spawn(1,muzzle,direction)).toBe(false);
 for(let tick=0;tick<7;tick++)bubbles.step(world,tick);
 const flying=bubbles.flight.getSnapshot()[0];
 expect(new Vector3().copy(flying.position).sub(muzzle).cross(new Vector3().copy(direction)).length()).toBeLessThan(1e-10);
 bubbles.clear();expect(bubbles.flight.getSnapshot()).toEqual([]);
 expect(()=>bubbles.flight.spawn(2,{...muzzle,x:NaN},direction)).toThrow();
 expect(bubbles.flight.getSnapshot()).toEqual([]);
 }finally{world.free();}
});

test('camera-side cover before the logical launch plane cannot be skipped',()=>{
 const world=new RAPIER.World({x:0,y:0,z:0});
 try{
 const blocker=world.createCollider(RAPIER.ColliderDesc.cuboid(.2,1,.1).setTranslation(2,1,1).setCollisionGroups(COLLISION_GROUPS.map));world.step();
 const aim=queryScreenAimTarget(world,{origin:{x:2,y:1,z:3},direction:{x:0,y:0,z:-1},range:70})!;
 const result=queryMuzzleRay(world,{x:0,y:1,z:0},{x:0,y:1,z:-.5},aim)!;
 expect(result.status).toBe('blocked-muzzle');expect(result.colliderHandle).toBe(blocker.handle);
 expect(Object.isFrozen(result.point)).toBe(true);expect(Object.isFrozen(result.origin)).toBe(true);
 }finally{world.free();}
});

test('camera selecting a far head cannot bypass a nearer bubble on the actual muzzle path',()=>{
 const world=new RAPIER.World({x:0,y:0,z:0});
 try{
 const registry=new TrainingTargets(),far=new LocalTrainingTarget(),bubble=new LocalTrainingTarget(),view=camera();
 const ray=createScreenAimRay(view,100)!,goal=new Vector3().copy(ray.origin).addScaledVector(new Vector3().copy(ray.direction),10);
 const muzzle=rifleMuzzlePosition(center,0,'sniper')!,near=goal.clone().sub(muzzle).multiplyScalar(.3).add(muzzle);
 const head=world.createCollider(RAPIER.ColliderDesc.ball(.05).setTranslation(goal.x,goal.y,goal.z).setSensor(true).setCollisionGroups(COLLISION_GROUPS.trainingTarget));
 const shell=world.createCollider(RAPIER.ColliderDesc.ball(.1).setTranslation(near.x,near.y,near.z).setSensor(true).setCollisionGroups(COLLISION_GROUPS.trainingTarget));
 registry.register(head.handle,far,'head');registry.register(shell.handle,bubble,'body',undefined,'bubble');world.step();
 const aim=registry.aim(world,ray)!;expect(aim.colliderHandle).toBe(head.handle);
 const result=queryMuzzleRay(world,center,muzzle,aim,100)!;
 const resolved=registry.resolveVolley(world,{tick:0,sequence:1},[result],'sniper');
 expect(bubble.getSnapshot().hp).toBeLessThan(100);expect(far.getSnapshot().hp).toBe(100);
 expect(resolved.pellets[0].contacts).toHaveLength(1);
 expect(new Vector3().copy(resolved.pellets[0].point).distanceTo(near)).toBeCloseTo(.1,5);
 }finally{world.free();}
});

test('all eight sampled shotgun rays hit their screen-space sample, with one physical muzzle origin',()=>{
 const world=new RAPIER.World({x:0,y:0,z:0});
 try{
 wall(world,-2);world.step();const registry=new TrainingTargets(),view=camera(),ray=createScreenAimRay(view,25)!;
 const muzzle=rifleMuzzlePosition(center,0,'shotgun')!,angle=6*Math.PI/180,points=[];
 for(let i=0;i<8;i++){
  const direction=spreadDirection(ray.direction,angle,(i+.5)/8,i/8)!;
  const sample=registry.aim(world,{...ray,direction})!,result=queryMuzzleRay(world,center,muzzle,sample,25)!;
  expect(result.origin).toEqual(muzzle);expect(result.status).toBe('hit');
  expect(new Vector3().copy(result.point).distanceTo(sample.point)).toBeLessThan(.00001);
  expect(pixels(result.point,view)).toBeLessThan(61);points.push(result.point);
 }
 expect(new Set(points.map(p=>JSON.stringify(p))).size).toBe(8);
 }finally{world.free();}
});
