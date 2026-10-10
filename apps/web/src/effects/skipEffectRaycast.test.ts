import { expect, test } from 'vitest';
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Raycaster, SphereGeometry, Vector3 } from 'three';
import { BUBBLE_CONFIG, PHYSICS_CONFIG, PLAYER_CONFIG, TRAINING_TARGET_LAYOUT } from '@bubble-arena/shared';
import { SHOT_EFFECT_CONFIG } from './ShotFeedback';
import { skipEffectRaycast } from './skipEffectRaycast';

const target = TRAINING_TARGET_LAYOUT[1].position;
const plate = new Vector3(target[0], target[1] + PLAYER_CONFIG.height / 2 + .38, target[2]);
const eye = new Vector3(target[0], 3.13, 4.45);
function rayToPlate() { return new Raycaster(eye, plate.clone().sub(eye).normalize(), 0, eye.distanceTo(plate)); }

test.each([true, false])('an expanded bubble burst (visible=%s) cannot hide the target plate, including its retained expired pool', visible => {
  const scene = new Group(), pool = new Group(); scene.add(pool);
  const geometry = new SphereGeometry(1, 16, 12), material = new MeshBasicMaterial({ transparent: true, opacity: .2, wireframe: true });
  const burst = new Mesh(geometry, material); pool.add(burst);
  try {
    burst.position.set(target[0], target[1] + .55, target[2] + .4);
    const total = Math.ceil(.3 * PHYSICS_CONFIG.tickRate);
    burst.scale.setScalar(.2 + (1 - 1 / total) * BUBBLE_CONFIG.explosionRadius);
    burst.visible = visible; scene.updateMatrixWorld(true);
    // Reproduces the old all-scene Html query: transparent wireframe and hidden
    // burst meshes still intersect before the anchor, even after the effect ends.
    expect(rayToPlate().intersectObjects([scene], true).some(hit => hit.object === burst)).toBe(true);
    pool.raycast = skipEffectRaycast;
    expect(rayToPlate().intersectObjects([scene], true)).toEqual([]);
  } finally { geometry.dispose(); material.dispose(); }
});

test('nested projectile and shot pools skip all active/inactive meshes without suppressing real wall occlusion', () => {
  const scene = new Group(), bubbles = new Group(), shots = new Group(), nested = new Group();
  bubbles.raycast = shots.raycast = skipEffectRaycast;
  scene.add(bubbles, shots); shots.add(nested);
  const material = new MeshBasicMaterial(), wallGeometry = new BoxGeometry(2, 2, .1);
  const wall = new Mesh(wallGeometry, material);
  wall.position.copy(eye).lerp(plate, .5); scene.add(wall);
  const geometries = [BUBBLE_CONFIG.radius, SHOT_EFFECT_CONFIG.muzzleRadius, SHOT_EFFECT_CONFIG.impactRadius, SHOT_EFFECT_CONFIG.pelletImpactRadius]
    .map(radius => new SphereGeometry(radius, 8, 6));
  try {
    geometries.forEach((geometry, i) => {
      const mesh = new Mesh(geometry, material); mesh.position.copy(eye).lerp(plate, .25);
      mesh.visible = i % 2 === 0; (i === 0 ? bubbles : nested).add(mesh);
    });
    scene.updateMatrixWorld(true);
    const hits = rayToPlate().intersectObjects([scene], true);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every(hit => hit.object === wall)).toBe(true);
    scene.remove(wall); scene.updateMatrixWorld(true);
    expect(rayToPlate().intersectObjects([scene], true)).toEqual([]);
  } finally { wallGeometry.dispose(); geometries.forEach(geometry => geometry.dispose()); material.dispose(); }
});
