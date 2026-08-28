import { store } from './rpc.js';

/**
 * Keys are scoped per world *and* per player, so two accounts on one browser
 * (or the same account across worlds) never share settings or a stale plan.
 */
const scope = () => `${window.game_data.world}:${window.game_data.player.id}`;

export const DEFAULT_SETTINGS = {
  group: 0,
  maxFields: 25,
  minMinutesBetween: 10,
  allowPartialLosses: false,
  useMaxLoot: true,
  includeNewBarbs: false,
  concurrency: 3,
  language: 'auto',
};

/** Preferences the popup owns and that apply to every world. */
const GLOBAL_KEY = 'fg:global';

export async function loadSettings() {
  const [saved, global] = await Promise.all([
    store.get(`fg:settings:${scope()}`).catch(() => null),
    store.get(GLOBAL_KEY).catch(() => null),
  ]);

  // Per-world values win for planning options; the popup's language and
  // concurrency win over whatever a per-world record happens to carry.
  const merged = { ...DEFAULT_SETTINGS, ...(saved || {}) };
  if (global && global.language) merged.language = global.language;
  if (global && global.concurrency) merged.concurrency = global.concurrency;
  return merged;
}

export function saveSettings(settings) {
  return store.set(`fg:settings:${scope()}`, settings);
}

export function loadPlan() {
  return store.get(`fg:plan:${scope()}`).catch(() => null);
}

export function savePlan(record) {
  return store.set(`fg:plan:${scope()}`, record);
}

export function clearPlan() {
  return store.remove(`fg:plan:${scope()}`);
}

export function loadUnitSpeeds() {
  return store.get(`fg:speeds:${window.game_data.world}`).catch(() => null);
}

export function saveUnitSpeeds(speeds) {
  return store.set(`fg:speeds:${window.game_data.world}`, speeds);
}
