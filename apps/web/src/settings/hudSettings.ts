export const HUD_SETTINGS = Object.freeze({ min: .5, max: 1.5, step: .05, default: 1, storageKey: 'bubble-arena.hud-scale.v1' });
interface Storage { getItem(key: string): string | null; setItem(key: string, value: string): void }
export function validHudScale(value: number) {
  return Number.isFinite(value) && value >= HUD_SETTINGS.min && value <= HUD_SETTINGS.max;
}
export function readHudScale(storage: Storage): number {
  try {
    const raw = storage.getItem(HUD_SETTINGS.storageKey);
    const value = raw === null || raw.trim() === '' ? NaN : Number(raw);
    return validHudScale(value) ? value : HUD_SETTINGS.default;
  } catch { return HUD_SETTINGS.default; }
}
export function saveHudScale(storage: Storage, value: number) {
  if (!validHudScale(value)) return false;
  try { storage.setItem(HUD_SETTINGS.storageKey, String(value)); return true; }
  catch { return false; }
}

// Match combatHud.css breakpoints. Reserve room for both bottom corners and
// the centered score beside the minimap; the user's saved preference is intact.
export function fitHudScale(preference: number, width: number, height: number) {
  const requested = validHudScale(preference) ? preference : HUD_SETTINGS.default;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return requested;
  const compact = width <= 800 || height <= 620;
  const minimumWidth = width <= 600 ? 340 : compact ? 576 : 688;
  return Math.min(requested, width / minimumWidth, height / (compact ? 400 : 480));
}
