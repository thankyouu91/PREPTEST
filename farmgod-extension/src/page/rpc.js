/** Promise wrapper over the postMessage bridge to chrome.storage. */

const ORIGIN = window.location.origin;
const pending = new Map();
let seq = 0;

window.addEventListener('message', (ev) => {
  if (ev.source !== window) return;
  const msg = ev.data;
  if (!msg || msg.__farmgod !== 'res') return;

  const entry = pending.get(msg.id);
  if (!entry) return;
  pending.delete(msg.id);
  clearTimeout(entry.timer);
  msg.error ? entry.reject(new Error(msg.error)) : entry.resolve(msg.payload);
});

function call(op, key, value) {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`storage ${op} timed out`));
    }, 5000);
    pending.set(id, { resolve, reject, timer });
    window.postMessage({ __farmgod: 'req', id, op, key, value }, ORIGIN);
  });
}

export const store = {
  get: (key) => call('get', key),
  set: (key, value) => call('set', key, value),
  remove: (key) => call('remove', key),
};
