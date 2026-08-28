const $ = (id) => document.getElementById(id);

/**
 * The popup edits shared preferences. They are stored once and merged into
 * every per-world settings record the page reads.
 */
const GLOBAL_KEY = 'fg:global';

async function load() {
  const bag = await chrome.storage.local.get(GLOBAL_KEY);
  const g = bag[GLOBAL_KEY] || {};
  $('language').value = g.language || 'auto';
  $('concurrency').value = g.concurrency ?? 3;
}

function flash(text) {
  $('status').textContent = text;
  setTimeout(() => ($('status').textContent = ''), 2000);
}

$('save').addEventListener('click', async () => {
  const language = $('language').value;
  const concurrency = Math.max(1, Math.min(8, parseInt($('concurrency').value, 10) || 3));

  await chrome.storage.local.set({ [GLOBAL_KEY]: { language, concurrency } });

  // Push the change into every per-world settings record so an already-open
  // tab picks it up on its next planning run.
  const all = await chrome.storage.local.get(null);
  const updates = {};
  for (const [key, value] of Object.entries(all)) {
    if (key.startsWith('fg:settings:')) updates[key] = { ...value, language, concurrency };
  }
  if (Object.keys(updates).length) await chrome.storage.local.set(updates);

  flash('Saved. Reload the loot assistant tab.');
});

$('clear').addEventListener('click', async () => {
  const all = await chrome.storage.local.get(null);
  const keys = Object.keys(all).filter((k) => k.startsWith('fg:plan:'));
  if (keys.length) await chrome.storage.local.remove(keys);
  flash(`Cleared ${keys.length} stored plan(s).`);
});

load();
