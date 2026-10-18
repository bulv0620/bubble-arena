import { expect,test } from 'vitest';
import { RIFLE_SPREAD_CONFIG,WEAPON_HANDLING } from '@bubble-arena/shared';
import { crosshairSize,RETICLE_LAYOUT } from './crosshairSize';
test('reticle opens continuously with cone angle and remains readable',()=>{
 const normal=RIFLE_SPREAD_CONFIG.normal;
 expect(crosshairSize(normal)).toBe(36);
 expect(crosshairSize(normal+RIFLE_SPREAD_CONFIG.bloomPerShot)).toBeGreaterThan(36);
 expect(crosshairSize(normal*RIFLE_SPREAD_CONFIG.airborneMultiplier)).toBeGreaterThan(crosshairSize(normal*RIFLE_SPREAD_CONFIG.movingMultiplier));
 expect(crosshairSize(NaN)).toBe(36);expect(crosshairSize(10)).toBe(648);
});
test('projection scales spread with viewport height and FOV instead of clamping shotgun/airborne cones to 112px',()=>{
 const angle=WEAPON_HANDLING.shotgun.spread.normal;
 expect(crosshairSize(angle)).toBeGreaterThan(112);
 for(const height of [600,720,1080,1440])for(const fov of [65,80]){
  const physicalRadius=height*Math.tan(angle)/(2*Math.tan(fov*Math.PI/360));
  expect(crosshairSize(angle,height,fov)*RETICLE_LAYOUT.circleRadius/RETICLE_LAYOUT.viewBox).toBeGreaterThanOrEqual(physicalRadius);
 }
 expect(crosshairSize(angle,1080)).toBeGreaterThan(crosshairSize(angle,720));
 expect(crosshairSize(angle,720,80)).toBeLessThan(crosshairSize(angle,720,65));
 for(const [h,f] of [[0,65],[720,0],[NaN,65],[720,180]])expect(crosshairSize(angle,h,f)).toBe(36);
});
