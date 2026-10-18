export const MOUSE_SETTINGS = Object.freeze({ min: 0.05, max: 3, step: 0.01, default: 1, storageKey: 'bubble-arena.mouse-speed.v1' });
export const SCOPE_MOUSE_SETTINGS = Object.freeze({ min: 0.05, max: 2, step: 0.01, default: 0.30, storageKey: 'bubble-arena.scope-mouse-multiplier.v1' });
interface Storage { getItem(key: string): string | null; setItem(key: string, value: string): void }
export function validMouseSpeed(value: number) {
  return Number.isFinite(value) && value >= MOUSE_SETTINGS.min && value <= MOUSE_SETTINGS.max;
}
export function readMouseSpeed(storage: Storage): number {
  try {
    const raw = storage.getItem(MOUSE_SETTINGS.storageKey);
    const value = raw === null || raw.trim() === '' ? NaN : Number(raw);
    return validMouseSpeed(value) ? value : MOUSE_SETTINGS.default;
  } catch { return MOUSE_SETTINGS.default; }
}
export function saveMouseSpeed(storage: Storage, value: number) {
  if (!validMouseSpeed(value)) return false;
  try { storage.setItem(MOUSE_SETTINGS.storageKey, String(value)); return true; }
  catch { return false; }
}
export function validScopeMouseMultiplier(value: number) {
  return Number.isFinite(value) && value >= SCOPE_MOUSE_SETTINGS.min && value <= SCOPE_MOUSE_SETTINGS.max;
}
export function readScopeMouseMultiplier(storage: Storage): number {
  try {
    const raw = storage.getItem(SCOPE_MOUSE_SETTINGS.storageKey);
    const value = raw === null || raw.trim() === '' ? NaN : Number(raw);
    return validScopeMouseMultiplier(value) ? value : SCOPE_MOUSE_SETTINGS.default;
  } catch { return SCOPE_MOUSE_SETTINGS.default; }
}
export function saveScopeMouseMultiplier(storage: Storage, value: number) {
  if (!validScopeMouseMultiplier(value)) return false;
  try { storage.setItem(SCOPE_MOUSE_SETTINGS.storageKey, String(value)); return true; }
  catch { return false; }
}
