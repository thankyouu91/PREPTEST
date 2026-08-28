/**
 * Request plumbing and page helpers. Runs in page context, so window.jQuery,
 * game_data and friends are all available.
 */
import { loadUnitSpeeds, saveUnitSpeeds } from './store.js';

const MAX_ATTEMPTS = 3;

/** One serial lane: at most one request of its own in flight at a time. */
class Lane {
  constructor() {
    this.list = [];
    this.working = false;
  }

  get length() {
    return this.list.length;
  }

  enqueue(item, front = false) {
    front ? this.list.unshift(item) : this.list.push(item);
    if (!this.working) this.start();
  }

  start() {
    if (!this.list.length) {
      this.working = false;
      return;
    }
    this.working = true;
    this.runNext();
  }

  runNext() {
    const item = this.list.shift();
    window
      .jQuery[item.action](...item.args)
      .done((data) => {
        item.resolve(data);
        this.start();
      })
      .fail((xhr) => {
        item.attempts += 1;
        if (item.attempts < MAX_ATTEMPTS) {
          // Retry ahead of the queue: a transient failure should not go to the
          // back of a hundred-page crawl.
          this.enqueue(item, true);
        } else {
          item.reject(
            new Error(
              `${item.action} failed after ${MAX_ATTEMPTS} attempts` +
                (xhr && xhr.status ? ` (HTTP ${xhr.status})` : '')
            )
          );
        }
        this.start();
      });
  }
}

/**
 * A fixed set of lanes. Concurrency is exactly `size` because each lane is
 * serial — this is the throttle that keeps a full crawl from turning into a
 * hundred simultaneous requests.
 *
 * The original script tried to do this but reduced the lane *lengths* to a
 * minimum value and then used that value as an index; since the accumulator
 * started at 0 and lengths are never negative, it always resolved to lane 0
 * and the other four lanes were dead. indexOf(min) is the fix.
 */
class RequestPool {
  constructor(size = 3) {
    this.resize(size);
  }

  resize(size) {
    const n = Math.max(1, Math.min(8, size | 0));
    this.lanes = Array.from({ length: n }, () => new Lane());
  }

  request(action, args) {
    return new Promise((resolve, reject) => {
      const item = { action, args, resolve, reject, attempts: 0 };
      const lengths = this.lanes.map((l) => l.length);
      this.lanes[lengths.indexOf(Math.min(...lengths))].enqueue(item);
    });
  }
}

export const pool = new RequestPool(3);
export const ajax = (...args) => pool.request('ajax', args);
export const get = (...args) => pool.request('get', args);

/* ------------------------------------------------------------------ */
/* Coordinates and numbers                                             */
/* ------------------------------------------------------------------ */

export function toCoord(text) {
  const match = (String(text).match(/\d{1,3}\|\d{1,3}/g) || [null]).pop();
  return match;
}

export const toNumber = (v) =>
  parseFloat(String(v).replace(/[^\d.,-]/g, '').replace(',', '.')) || 0;

/**
 * Counts only. Some markets print thousands separators ("1.234"), which
 * parseFloat would read as 1.234 — strip every non-digit instead.
 */
export const toInt = (v) => parseInt(String(v).replace(/[^\d-]/g, ''), 10) || 0;

/* ------------------------------------------------------------------ */
/* Unit speeds                                                         */
/* ------------------------------------------------------------------ */

/** Minutes per field for each unit, cached per world. */
export async function getUnitSpeeds() {
  const cached = await loadUnitSpeeds();
  if (cached && Object.keys(cached).length) return cached;

  const xml = await get('/interface.php?func=get_unit_info');
  const speeds = {};
  window
    .jQuery(xml)
    .find('config')
    .children()
    .each((i, el) => {
      speeds[window.jQuery(el).prop('nodeName')] = parseFloat(
        window.jQuery(el).find('speed').text()
      );
    });

  await saveUnitSpeeds(speeds);
  return speeds;
}

/* ------------------------------------------------------------------ */
/* Server time                                                         */
/* ------------------------------------------------------------------ */

export function getCurrentServerTime() {
  const parts = window
    .jQuery('#serverTime')
    .closest('p')
    .text()
    .match(/\d+/g);
  if (!parts || parts.length < 6) return Date.now();
  const [hour, min, sec, day, month, year] = parts.map(Number);
  return new Date(year, month - 1, day, hour, min, sec).getTime();
}

/**
 * Parse a command arrival string ("today at 14:03:20", "tomorrow at …",
 * "on 12.04. at …"). The patterns come out of window.lang so this works on
 * every market without hard-coding a single localized word.
 */
export function timestampFromString(timestr) {
  const $ = window.jQuery;
  const lang = window.lang || {};
  let d = $('#serverDate').text().split('/').map(Number);

  const build = (key, ...slots) => {
    const tpl = lang[key];
    if (!tpl) return null;
    let pattern = tpl;
    slots.forEach(([token, group]) => {
      pattern = pattern.replace(token, group);
    });
    return new RegExp(pattern).exec(timestr);
  };

  const today = build('aea2b0aa9ae1534226518faaefffdaad', ['%s', '([\\d+|:]+)']);
  const tomorrow = build('57d28d1b211fddbb7a499ead5bf23079', ['%s', '([\\d+|:]+)']);
  const later = build(
    '0cb274c906d622fa8ce524bcfbb7552d',
    ['%1', '([\\d+|\\.]+)'],
    ['%2', '([\\d+|:]+)']
  );

  let t;
  let date;
  if (today) {
    t = today[1].split(':').map(Number);
    date = new Date(d[2], d[1] - 1, d[0], t[0], t[1], t[2] || 0);
  } else if (tomorrow) {
    t = tomorrow[1].split(':').map(Number);
    date = new Date(d[2], d[1] - 1, d[0] + 1, t[0], t[1], t[2] || 0);
  } else if (later) {
    const dd = (later[1] + d[2]).split('.').map(Number);
    t = later[2].split(':').map(Number);
    date = new Date(dd[2], dd[1] - 1, dd[0], t[0], t[1], t[2] || 0);
  } else {
    return null;
  }

  return date.getTime();
}

/* ------------------------------------------------------------------ */
/* Paged crawling                                                      */
/* ------------------------------------------------------------------ */

function determineNextPage(page, $html) {
  const $ = window.jQuery;
  const isFarmScreen = $html.find('#am_widget_Farm').length > 0;

  const rowCount =
    $html.find('#scavenge_mass_screen').length > 0
      ? $html.find('tr[id*="scavenge_village"]').length
      : $html.find('tr.row_a, tr.row_ax, tr.row_b, tr.row_bx').length;

  let lastPage;
  if (isFarmScreen) {
    // The loot assistant collapses its pager past ~15 pages, so the reliable
    // signal is the highest number still printed, not the number of links.
    const items = $html
      .find('#plunder_list_nav')
      .first()
      .find('a.paged-nav-item, strong.paged-nav-item');
    const labels = items
      .map((i, el) => parseInt(String(el.textContent).replace(/\D/g, ''), 10))
      .get()
      .filter((n) => !Number.isNaN(n));
    lastPage = labels.length ? Math.max(...labels) - 1 : 0;
  } else {
    const $select = $html.find('.paged-nav-item').first().closest('td').find('select').first();
    lastPage =
      $select.length > 0
        ? $select.find('option').length - 1
        : $html.find('.paged-nav-item').not('[href*="page=-1"]').length;
  }

  const pageSize =
    $('#mobileHeader').length > 0
      ? 10
      : parseInt($html.find('input[name="page_size"]').val(), 10) || 1000;

  // page=-1 means "everything", but the server caps it at 1000 rows; if we hit
  // exactly that, fall back to real pagination.
  if (page === -1 && rowCount >= 1000) return Math.floor(1000 / pageSize);
  if (page < lastPage) return page + 1;
  return false;
}

export async function processAllPages(url, processorFn, onProgress) {
  const isFarm = url.includes('am_farm');
  let page = isFarm || url.includes('scavenge_mass') ? 0 : -1;
  let visited = 0;

  for (;;) {
    const param = isFarm ? `&Farm_page=${page}` : `&page=${page}`;
    const html = await ajax({ url: url + param });
    const $html = window.jQuery(html);

    processorFn($html);
    visited += 1;
    if (onProgress) onProgress(visited);

    const next = determineNextPage(page, $html);
    if (next === false) break;
    page = next;
  }
}
