import { describe, expect, it } from 'vitest';
import { LocalMatch } from './LocalMatch';
import { bindRoomStart } from './bindRoomStart';
describe('room loading to existing match start', () => {
  it('waits for readiness and retains the full existing countdown', () => {
    const match = new LocalMatch(); const detach = bindRoomStart(match);
    match.step(); expect(match.getSnapshot().phase).toBe('waiting');
    match.setSceneReady(true); match.step(); expect(match.getSnapshot()).toMatchObject({ phase: 'countdown', countdownRemaining: 3 });
    for (let i = 0; i < 180; i++) match.step();
    expect(match.getSnapshot().phase).toBe('playing'); detach(); match.dispose();
  });
  it('handles already-loaded scenes and repeated setup without creating another match', () => {
    const match = new LocalMatch(); match.setSceneReady(true);
    const stopA = bindRoomStart(match), stopB = bindRoomStart(match); stopA();
    match.step(); const first = match.getSnapshot(); match.setSceneReady(true); match.step();
    expect(match.getSnapshot().phase).toBe('countdown'); expect(match.getSnapshot().countdownRemaining).toBe(first.countdownRemaining);
    stopB(); match.dispose();
  });
  it('unsubscribes while loading and cancels a pending start if readiness is lost', () => {
    const match = new LocalMatch(); const detach = bindRoomStart(match); detach();
    match.setSceneReady(true); match.step(); expect(match.getSnapshot().phase).toBe('waiting');
    const detachAgain = bindRoomStart(match); match.setSceneReady(false); match.step();
    expect(match.getSnapshot().phase).toBe('waiting'); detachAgain(); match.dispose();
    match.setSceneReady(true); match.step(); expect(match.getSnapshot().phase).toBe('waiting');
  });
});
