/**
 * Reads everything the planner needs out of the game's own pages. This is the
 * slow part of a run — four crawls — and the part the request pool throttles.
 */
import {
  ajax,
  get,
  processAllPages,
  getUnitSpeeds,
  timestampFromString,
  toCoord,
  toInt,
} from './lib.js';

// Never farmed with, so they are excluded from a village's available troops to
// keep the units array aligned with the loot-assistant template inputs.
const SKIP_UNITS = ['ram', 'catapult', 'knight', 'snob', 'militia'];

export const farmableUnits = () =>
  window.game_data.units.filter((u) => !SKIP_UNITS.includes(u));

/* ---------------------------------------------------------------- */

function scrapeVillages($html, out) {
  const $ = window.jQuery;
  const isMobile = $('#mobileHeader').length > 0;

  if (isMobile) {
    $html.find('.overview-container > div').each((i, el) => {
      const $el = $(el);
      const $label = $el.find('.quickedit-label');
      const coord = toCoord($label.text());
      if (!coord) return;

      const byName = {};
      $el.find('.overview-units-row > div.unit-row-item').each((j, cell) => {
        const src = $(cell).find('img').attr('src');
        const $count = $(cell).find('span.unit-row-name');
        if (!src || !$count.length) return;
        const unit = src.split('unit_')[1]?.replace(/(@2x)?\.(webp|png|gif)$/, '');
        if (unit) byName[unit] = parseInt($count.text(), 10) || 0;
      });

      out[coord] = {
        name: $label.attr('data-text') || coord,
        id: parseInt($el.find('.quickedit-vn').data('id'), 10),
        units: farmableUnits().map((u) => byName[u] || 0),
      };
    });
    return;
  }

  $html
    .find('#combined_table')
    .find('.row_a, .row_b')
    // Rows carrying this marker are not ordinary own villages in the combined
    // overview; the original script skipped them and so do we.
    .filter((i, el) => $(el).find('.bonus_icon_33').length === 0)
    .each((i, el) => {
      const $el = $(el);
      const $label = $el.find('.quickedit-label').first();
      const coord = toCoord($label.text());
      if (!coord) return;

      const units = $el
        .find('.unit-item')
        .filter((index) => !SKIP_UNITS.includes(window.game_data.units[index]))
        .map((index, cell) => toInt($(cell).text()))
        .get();

      out[coord] = {
        name: $label.data('text') || coord,
        id: parseInt($el.find('.quickedit-vn').first().data('id'), 10),
        units,
      };
    });
}

function scrapeCommands($html, out) {
  const $ = window.jQuery;
  $html
    .find('#commands_table')
    .find('.row_a, .row_ax, .row_b, .row_bx')
    .each((i, el) => {
      const $el = $(el);
      const coord = toCoord($el.find('.quickedit-label').first().text());
      if (!coord) return;
      const ts = timestampFromString($el.find('td').eq(2).text().trim());
      if (ts === null) return;
      (out[coord] || (out[coord] = [])).push(Math.round(ts / 1000));
    });
}

function scrapeTemplates($html, out, speeds) {
  const $ = window.jQuery;
  $html
    .find('form[action*="action=edit_all"]')
    .find('input[type="hidden"][name*="template"]')
    .closest('tr')
    .each((i, el) => {
      const $el = $(el);
      const iconClass = $el.prev('tr').find('a.farm_icon').first().attr('class') || '';
      const match = iconClass.match(/farm_icon_(\w+)/);
      if (!match) return;

      const $inputs = $el.find('input[type="text"], input[type="number"]');
      const units = $inputs.map((j, input) => toInt($(input).val())).get();

      out[match[1]] = {
        id: toInt(
          $el.find('input[type="hidden"][name*="template"][name*="[id]"]').first().val()
        ),
        units,
        // Travel time is set by the slowest unit actually in the template.
        speed: Math.max(
          0,
          ...$inputs
            .map((j, input) => {
              const count = toInt($(input).val());
              if (count <= 0) return 0;
              const unit = String($(input).attr('name') || '').trim().split('[')[0];
              return speeds[unit] || 0;
            })
            .get()
        ),
      };
    });
}

function scrapeFarms($html, out) {
  const $ = window.jQuery;
  $html
    .find('#plunder_list')
    .find('tr[id^="village_"]')
    .each((i, el) => {
      const $el = $(el);
      const coord = toCoord($el.find('a[href*="screen=report&mode=all&view="]').first().text());
      if (!coord) return;

      const dot = $el.find('img[src*="graphic/dots/"]').attr('src') || '';
      const colour = (dot.match(/dots\/(green|yellow|red|blue|red_blue)/) || [])[1];

      out[coord] = {
        id: parseInt(String($el.attr('id')).split('_')[1], 10),
        color: colour || 'green',
        max_loot: $el.find('img[src*="max_loot/1"]').length > 0,
      };
    });
}

async function addNewBarbarians(farms) {
  const text = await get('/map/village.txt');
  let added = 0;
  for (const line of String(text).split(/[\r\n]+/)) {
    if (!line) continue;
    const [id, , x, y, playerId] = line.split(',');
    const coord = `${x}|${y}`;
    if (playerId === '0' && !Object.prototype.hasOwnProperty.call(farms, coord)) {
      // No `color` key on purpose: the planner treats a colourless target as
      // never-before-seen and is stricter about scheduling it.
      farms[coord] = { id: parseInt(id, 10) };
      added += 1;
    }
  }
  return added;
}

/**
 * @param {object} options {group, includeNewBarbs, allowPartialLosses}
 * @param {(stage:string, n:number)=>void} onProgress
 */
export async function collect(options, onProgress = () => {}) {
  const TW = window.TribalWars;
  const speeds = await getUnitSpeeds();

  const villages = {};
  const commands = {};
  const templates = {};
  const farms = {};

  await Promise.all([
    processAllPages(
      TW.buildURL('GET', 'overview_villages', { mode: 'combined', group: options.group }),
      ($html) => scrapeVillages($html, villages),
      (n) => onProgress('villages', n)
    ),
    processAllPages(
      TW.buildURL('GET', 'overview_villages', { mode: 'commands', type: 'attack' }),
      ($html) => scrapeCommands($html, commands),
      (n) => onProgress('commands', n)
    ),
    processAllPages(
      TW.buildURL('GET', 'am_farm'),
      ($html) => {
        if (!Object.keys(templates).length) scrapeTemplates($html, templates, speeds);
        scrapeFarms($html, farms);
      },
      (n) => onProgress('farms', n)
    ),
  ]);

  let newBarbs = 0;
  if (options.includeNewBarbs) {
    onProgress('barbs', 0);
    newBarbs = await addNewBarbarians(farms);
  }

  // Red means the last run lost everything; yellow means partial losses and is
  // opt-in. Colourless entries are freshly found barbs and always stay.
  const kept = {};
  for (const [coord, farm] of Object.entries(farms)) {
    const c = farm.color;
    if (c === 'red' || c === 'red_blue') continue;
    if (c === 'yellow' && !options.allowPartialLosses) continue;
    kept[coord] = farm;
  }

  return {
    villages,
    commands,
    farms: kept,
    templates,
    stats: {
      villages: Object.keys(villages).length,
      farms: Object.keys(kept).length,
      dropped: Object.keys(farms).length - Object.keys(kept).length,
      newBarbs,
    },
  };
}

export async function loadGroups() {
  const res = await ajax({
    url: window.TribalWars.buildURL('GET', 'groups', { ajax: 'load_group_menu' }),
    dataType: 'json',
  });
  return (res && res.result) || [];
}
