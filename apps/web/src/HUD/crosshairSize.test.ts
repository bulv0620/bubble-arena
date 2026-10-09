import { expect, test } from 'vitest';
import { RIFLE_SPREAD_CONFIG } from '@bubble-arena/shared';
import { crosshairSize } from './crosshairSize';
test('reticle opens continuously with actual spread and remains bounded/readable', () => {
  const normal = RIFLE_SPREAD_CONFIG.normal;
  expect(crosshairSize(normal)).toBe(36);
  expect(crosshairSize(normal + RIFLE_SPREAD_CONFIG.bloomPerShot)).toBeGreaterThan(36);
  expect(crosshairSize(normal * RIFLE_SPREAD_CONFIG.airborneMultiplier)).toBeGreaterThan(crosshairSize(normal * RIFLE_SPREAD_CONFIG.movingMultiplier));
  expect(crosshairSize(NaN)).toBe(36); expect(crosshairSize(10)).toBe(112);
});
