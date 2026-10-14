import { expect, test } from 'vitest';
import { parseRescueProgressFrame, RESCUE_PLAYER_CAPACITY, type RescueProgressFrame } from './rescue';
const frame = (): RescueProgressFrame => ({ players: [{ playerId: 'a', teamId: 'red', life: { status: 'normal', lifeId: 1, revision: 0 }, position: { x: 0, y: .9, z: 0 }, grounded: true, connected: true }],
  controls: [{ playerId: 'a', targetPlayerId: null, held: false, active: true, move: false, jump: false, fire: false, reload: false, weaponSwitch: false, aim: false }], damagedPlayerIds: [], matchFinished: false });
test('frame deep-copies/freeze bounded authoritative facts, including effective-damage IDs and all interruption intent flags', () => {
  const input = frame(), parsed = parseRescueProgressFrame({ ...input, damagedPlayerIds: ['a'] });
  Object.assign(input.players[0].position, { x: 9 }); expect(parsed.players[0].position.x).toBe(0);
  for (const object of [parsed, parsed.players, parsed.controls, parsed.damagedPlayerIds, parsed.controls[0]]) expect(Object.isFrozen(object)).toBe(true);
  expect(RESCUE_PLAYER_CAPACITY).toBe(8); expect(parsed.damagedPlayerIds).toEqual(['a']);
});
test('duplicate/missing participants, duplicate controls/damage or external IDs reject', () => {
  const input = frame();
  for (const invalid of [{ ...input, players: [...input.players, ...input.players] }, { ...input, controls: [...input.controls, ...input.controls] },
    { ...input, damagedPlayerIds: ['a', 'a'] }, { ...input, damagedPlayerIds: ['other'] }, { ...input, players: [] }]) expect(() => parseRescueProgressFrame(invalid)).toThrow(TypeError);
});
test('capacity, sparse/extra/accessor array fields and non-boolean or unknown control fields reject without executing getters', () => {
  const input = frame();
  const accessor = Object.defineProperty([input.players[0]], '0', { get: () => { throw new Error('Must not execute'); } });
  for (const players of [Array(1), accessor, Object.assign([...input.players], { injected: true }), Array(9).fill(input.players[0])]) expect(() => parseRescueProgressFrame({ ...input, players })).toThrow();
  for (const field of ['held', 'active', 'move', 'jump', 'fire', 'reload', 'weaponSwitch', 'aim']) expect(() => parseRescueProgressFrame({ ...input, controls: [{ ...input.controls[0], [field]: 1 }] })).toThrow(TypeError);
  expect(() => parseRescueProgressFrame({ ...input, controls: [{ ...input.controls[0], progress: 1 }] })).toThrow(TypeError);
  expect(() => parseRescueProgressFrame({ ...input, matchFinished: undefined })).toThrow(TypeError);
});
