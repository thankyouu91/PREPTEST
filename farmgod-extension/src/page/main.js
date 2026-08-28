/**
 * Entry point, injected into page context by the content script.
 *
 * Flow: read settings -> build panel -> (on demand) crawl -> plan -> render.
 * The render is where automation stops; see the design note in ui.js.
 */
import { pool, getCurrentServerTime } from './lib.js';
import { collect, loadGroups, farmableUnits } from './scraper.js';
import { createPlanning } from './planner.js';
import { pickLanguage, t } from './i18n.js';
import { loadSettings, saveSettings, loadPlan, savePlan } from './store.js';
import { Panel } from './ui.js';

const PLAN_STALE_MINUTES = 30;

function ready() {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (window.jQuery && window.game_data && window.TribalWars) return resolve();
      if (Date.now() - started > 15000) return reject(new Error('game globals never appeared'));
      setTimeout(tick, 100);
    };
    tick();
  });
}

function minutesAgo(ts) {
  return Math.max(0, Math.round((Date.now() - ts) / 60000));
}

async function boot() {
  await ready();

  const gd = window.game_data;
  if (gd.screen !== 'am_farm') return;

  const settings = await loadSettings();
  const language = pickLanguage(settings.language);
  const L = t(language);

  if (!gd.features?.Premium?.active || !gd.features?.FarmAssistent?.active) {
    window.UI.ErrorMessage(L.missing);
    return;
  }

  pool.resize(settings.concurrency);

  const groups = await loadGroups().catch(() => [{ group_id: 0, name: 'all' }]);

  const panel = new Panel({
    settings,
    language,
    groups,
    onSettingsChange: (s) => {
      pool.resize(s.concurrency);
      saveSettings(s).catch(() => {});
    },
    onPlan: async (opts) => {
      const counts = { villages: 0, commands: 0, farms: 0 };
      panel.notice('');
      panel.status(`${L.scanning}…`);

      try {
        const data = await collect(opts, (stage, n) => {
          counts[stage] = n;
          panel.status(
            `${L.scanning}… ${counts.villages + counts.commands + counts.farms} pages`
          );
        });

        if (!data.templates.a) {
          window.UI.ErrorMessage(L.templateWarn);
          panel.status('');
          return;
        }

        // Village troop arrays and template arrays have to line up index for
        // index, or subtractArrays compares the wrong units. Mismatch means the
        // game changed a form and the scraper needs updating — say so loudly
        // rather than planning nonsense.
        const width = farmableUnits().length;
        const bad = Object.entries(data.templates).filter(
          ([, tpl]) => tpl.units.length !== width
        );
        if (bad.length) {
          window.UI.ErrorMessage(
            `Template ${bad.map(([n]) => n.toUpperCase()).join('/')} has ` +
              `${bad[0][1].units.length} unit fields but villages report ${width}.`
          );
          panel.status('');
          return;
        }
        // A must be the small template and B the big one, otherwise the
        // full-loot rule sends less than it should.
        const sum = (u) => u.reduce((a, b) => a + b, 0);
        if (data.templates.b && sum(data.templates.a.units) >= sum(data.templates.b.units)) {
          panel.notice(`<div class="fgNotice">${L.templateWarn}</div>`);
        }

        const plan = createPlanning(
          data,
          {
            maxFields: opts.maxFields,
            minMinutesBetween: opts.minMinutesBetween,
            useMaxLoot: opts.useMaxLoot,
          },
          Math.round(getCurrentServerTime() / 1000)
        );

        panel.planCreatedAt = Date.now();
        panel.showPlan(plan, []);
        await savePlan({
          createdAt: panel.planCreatedAt,
          settings: opts,
          rows: plan.rows,
          sent: [],
        }).catch(() => {});
      } catch (err) {
        console.error('[FarmGod]', err);
        window.UI.ErrorMessage(String(err.message || err));
        panel.status('');
      }
    },
  });

  // A plan survives a reload or a village switch, which is the main reason to
  // be an extension rather than a bookmarklet.
  const saved = await loadPlan().catch(() => null);
  if (saved && Array.isArray(saved.rows) && saved.rows.length) {
    const age = minutesAgo(saved.createdAt);
    const pending = saved.rows.filter((r) => !(saved.sent || []).includes(r.id));
    if (pending.length) {
      panel.planCreatedAt = saved.createdAt;
      panel.showPlan({ rows: saved.rows, skipped: {} }, saved.sent || []);
      const warn = age >= PLAN_STALE_MINUTES ? ' ⚠' : '';
      panel.notice(
        `<div class="fgNotice"><span>${L.restored.replace(
          '%s',
          `${age} min`
        )}${warn}</span><input type="button" class="btn fgDiscard" value="${L.discard}"></div>`
      );
      panel.$panel.find('.fgDiscard').on('click', () => panel.discardPlan());
    }
  }

  window.FarmGodPlanner = { panel, version: '1.0.0' };
}

boot().catch((err) => console.error('[FarmGod] boot failed', err));
