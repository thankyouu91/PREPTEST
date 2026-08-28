/**
 * Content script. Runs in the isolated world, so it can reach chrome.storage
 * but not the page's game_data / jQuery / TribalWars. Its whole job is to
 *   1. inject the page-context module, and
 *   2. answer storage requests coming back from it.
 */
(function () {
  'use strict';

  const ORIGIN = window.location.origin;

  function inject() {
    const s = document.createElement('script');
    s.type = 'module';
    s.src = chrome.runtime.getURL('src/page/main.js');
    s.addEventListener('load', () => s.remove());
    s.addEventListener('error', () =>
      console.error('[FarmGod] failed to inject page module')
    );
    (document.head || document.documentElement).appendChild(s);
  }

  function reply(id, payload, error) {
    window.postMessage({ __farmgod: 'res', id, payload, error }, ORIGIN);
  }

  window.addEventListener('message', async (ev) => {
    if (ev.source !== window) return;
    const msg = ev.data;
    if (!msg || msg.__farmgod !== 'req') return;

    try {
      // Losing this on an extension reload is normal; surface it instead of
      // leaving the page hanging on a promise that never settles.
      if (!chrome.runtime?.id) throw new Error('extension context invalidated');

      if (msg.op === 'get') {
        const bag = await chrome.storage.local.get(msg.key);
        reply(msg.id, bag[msg.key] ?? null, null);
      } else if (msg.op === 'set') {
        await chrome.storage.local.set({ [msg.key]: msg.value });
        reply(msg.id, true, null);
      } else if (msg.op === 'remove') {
        await chrome.storage.local.remove(msg.key);
        reply(msg.id, true, null);
      } else {
        throw new Error(`unknown op: ${msg.op}`);
      }
    } catch (e) {
      reply(msg.id, null, String((e && e.message) || e));
    }
  });

  inject();
})();
