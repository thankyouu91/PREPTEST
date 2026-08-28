/**
 * Panel rendering and the send path.
 *
 * DESIGN CONSTRAINT — read before changing anything below.
 * Planning is automatic; dispatch is not. Every attack leaves this file from
 * inside a real user gesture (a click on a row, or Enter on the focused page)
 * and nothing here holds a timer, interval, or self-scheduling callback that
 * could send on its own. That is the line between a planning aid and a bot,
 * and it is deliberate. Do not add one.
 */
import { t } from './i18n.js';
import { savePlan, clearPlan } from './store.js';

const PANEL_ID = 'farmGodPanel';

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const STYLE = `
#${PANEL_ID}{margin:8px 0;border:1px solid #7d510f;background:#f4e4bc;}
#${PANEL_ID} h4{margin:0;padding:4px 8px;background:#c1a264;border-bottom:1px solid #7d510f;font-size:12px;}
#${PANEL_ID} .fgBody{padding:6px 8px;}
#${PANEL_ID} .fgForm{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;font-size:11px;margin-bottom:6px;}
#${PANEL_ID} .fgForm label{display:flex;align-items:center;gap:4px;white-space:nowrap;}
#${PANEL_ID} .fgForm input[type=text]{width:52px;}
#${PANEL_ID} .fgStatus{font-size:11px;margin:4px 0;min-height:14px;}
#${PANEL_ID} .fgSkips{font-size:10px;color:#603000;margin-bottom:4px;}
#${PANEL_ID} .fgNotice{background:#fff3c4;border:1px solid #c1a264;padding:4px 6px;font-size:11px;margin-bottom:6px;display:flex;gap:8px;align-items:center;}
#${PANEL_ID} table.fgTable{width:100%;border-collapse:collapse;}
#${PANEL_ID} table.fgTable th{font-size:11px;text-align:center;}
#${PANEL_ID} table.fgTable td{text-align:center;font-size:11px;padding:1px 2px;}
#${PANEL_ID} .fgHint{font-size:10px;color:#603000;margin-top:4px;font-style:italic;}
#${PANEL_ID} .fgScroll{max-height:420px;overflow-y:auto;}
#${PANEL_ID} tr.fgNext td{outline:1px solid #7d510f;}
`;

export class Panel {
  constructor({ settings, language, groups, onPlan, onSettingsChange }) {
    this.$ = window.jQuery;
    this.lang = t(language);
    this.settings = settings;
    this.groups = groups;
    this.onPlan = onPlan;
    this.onSettingsChange = onSettingsChange;
    this.rows = [];
    this.sent = new Set();
    this.busy = false;
    this.render();
  }

  render() {
    const $ = this.$;
    const L = this.lang;

    if (!$('#farmGodStyle').length) {
      $('<style id="farmGodStyle">').text(STYLE).appendTo('head');
    }

    $(`#${PANEL_ID}`).remove();

    const groupOptions = this.groups
      .map((g) =>
        g.type === 'separator'
          ? '<option disabled></option>'
          : `<option value="${esc(g.group_id)}" ${
              String(g.group_id) === String(this.settings.group) ? 'selected' : ''
            }>${esc(g.name)}</option>`
      )
      .join('');

    const s = this.settings;
    const checkbox = (cls, on, label) =>
      `<label><input type="checkbox" class="${cls}" ${on ? 'checked' : ''}>${esc(label)}</label>`;

    this.$panel = $(`
      <div id="${PANEL_ID}">
        <h4>${esc(L.title)}</h4>
        <div class="fgBody">
          <div class="fgForm">
            <label>${esc(L.group)} <select class="fgGroup">${groupOptions}</select></label>
            <label>${esc(L.maxFields)} <input type="text" class="fgFields" value="${esc(s.maxFields)}"></label>
            <label>${esc(L.minutes)} <input type="text" class="fgMinutes" value="${esc(s.minMinutesBetween)}"></label>
            ${checkbox('fgMaxloot', s.useMaxLoot, L.maxloot)}
            ${checkbox('fgLosses', s.allowPartialLosses, L.losses)}
            ${checkbox('fgBarbs', s.includeNewBarbs, L.newbarbs)}
            <input type="button" class="btn fgPlan" value="${esc(L.plan)}">
          </div>
          <div class="fgNoticeSlot"></div>
          <div class="fgStatus"></div>
          <div class="fgSkips"></div>
          <div class="fgScroll"><table class="vis fgTable"><tbody class="fgRows"></tbody></table></div>
          <div class="fgHint">${esc(L.hint)}</div>
        </div>
      </div>
    `);

    const $anchor = $('#am_widget_Farm').first();
    $anchor.length ? $anchor.before(this.$panel) : $('#contentContainer').prepend(this.$panel);

    this.$panel.find('.fgPlan').on('click', () => {
      this.persistSettings();
      this.onPlan(this.readSettings());
    });

    // Enter sends the next row. Ignored while typing in the option fields, so
    // adjusting "max fields" never fires an attack.
    this.keyHandler = (ev) => {
      if ((ev.keyCode || ev.which) !== 13) return;
      const tag = String(ev.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
      const $next = this.$panel.find('tr.fgRow').first();
      if ($next.length) {
        ev.preventDefault();
        this.send($next);
      }
    };
    $(document).on('keydown.farmGod', this.keyHandler);
  }

  readSettings() {
    const p = this.$panel;
    return {
      ...this.settings,
      group: parseInt(p.find('.fgGroup').val(), 10) || 0,
      maxFields: parseFloat(p.find('.fgFields').val()) || 25,
      minMinutesBetween: parseFloat(p.find('.fgMinutes').val()) || 0,
      useMaxLoot: p.find('.fgMaxloot').prop('checked'),
      allowPartialLosses: p.find('.fgLosses').prop('checked'),
      includeNewBarbs: p.find('.fgBarbs').prop('checked'),
    };
  }

  persistSettings() {
    this.settings = this.readSettings();
    this.onSettingsChange(this.settings);
  }

  status(text) {
    this.$panel.find('.fgStatus').html(text);
  }

  notice(html) {
    this.$panel.find('.fgNoticeSlot').html(html || '');
  }

  showSkips(skipped) {
    const L = this.lang;
    const parts = [];
    if (skipped.tooFar) parts.push(`${skipped.tooFar} ${L.tooFar}`);
    if (skipped.noTroops) parts.push(`${skipped.noTroops} ${L.noTroops}`);
    if (skipped.tooSoon) parts.push(`${skipped.tooSoon} ${L.tooSoon}`);
    this.$panel
      .find('.fgSkips')
      .text(parts.length ? `${L.skipped}: ${parts.join(' · ')}` : '');
  }

  /** @param {object} plan result of createPlanning @param {string[]} alreadySent */
  showPlan(plan, alreadySent = []) {
    const L = this.lang;
    this.rows = plan.rows;
    this.sent = new Set(alreadySent);
    this.showSkips(plan.skipped);
    this.renderRows();
  }

  renderRows() {
    const $ = this.$;
    const L = this.lang;
    const base = window.game_data.link_base_pure;
    const pending = this.rows.filter((r) => !this.sent.has(r.id));

    const header = `<tr><th>${esc(L.origin)}</th><th>${esc(L.target)}</th><th>${esc(
      L.fields
    )}</th><th>${esc(L.send)}</th></tr>`;

    if (!pending.length) {
      this.$panel.find('.fgRows').html(
        `${header}<tr><td colspan="4">${esc(L.empty)}</td></tr>`
      );
      this.updateCounter();
      return;
    }

    const body = pending
      .map(
        (r, i) => `
        <tr class="fgRow row_${i % 2 === 0 ? 'a' : 'b'}" data-id="${esc(r.id)}">
          <td><a href="${base}info_village&id=${esc(r.origin.id)}">${esc(r.origin.name)} (${esc(
          r.origin.coord
        )})</a></td>
          <td><a href="${base}info_village&id=${esc(r.target.id)}">${esc(r.target.coord)}</a></td>
          <td>${r.fields.toFixed(2)}</td>
          <td><a href="#" class="fgSend farm_icon farm_icon_${esc(
            r.template.name
          )}" style="margin:auto;" data-origin="${esc(r.origin.id)}" data-target="${esc(
          r.target.id
        )}" data-template="${esc(r.template.id)}"></a></td>
        </tr>`
      )
      .join('');

    const $rows = this.$panel.find('.fgRows').html(header + body);
    $rows.find('.fgSend').on('click', (ev) => {
      ev.preventDefault();
      this.send($(ev.currentTarget).closest('tr'));
    });
    $rows.find('tr.fgRow').first().addClass('fgNext');
    this.updateCounter();
  }

  updateCounter() {
    const L = this.lang;
    const total = this.rows.length;
    const done = this.rows.filter((r) => this.sent.has(r.id)).length;
    this.status(`<b>${done} / ${total}</b> ${esc(L.sent)}`);
  }

  /**
   * Send exactly one attack. Called only from a click handler or the Enter
   * key handler above — never from a timer.
   */
  send($row) {
    const $ = this.$;
    const L = this.lang;
    const AM = window.Accountmanager;

    // Mirror the game's own throttle so a fast typist cannot outrun it.
    const now = window.Timing.getElapsedTimeSinceLoad();
    if (this.busy || (AM.farm.last_click && now - AM.farm.last_click < 200)) return;

    const $icon = $row.find('.fgSend');
    const id = $row.data('id');
    this.busy = true;
    AM.farm.last_click = now;

    const finish = (ok, message) => {
      ok ? window.UI.SuccessMessage(message) : window.UI.ErrorMessage(message || L.sendError);
      this.sent.add(id);
      this.persistPlan();
      $row.remove();
      this.$panel.find('tr.fgRow').removeClass('fgNext').first().addClass('fgNext');
      this.updateCounter();
      this.busy = false;
    };

    window.TribalWars.post(
      AM.send_units_link.replace(/village=(\d+)/, `village=${$icon.data('origin')}`),
      null,
      {
        target: $icon.data('target'),
        template_id: $icon.data('template'),
        source: $icon.data('origin'),
      },
      (r) => finish(true, r && r.success),
      (r) => finish(false, typeof r === 'string' ? r : null)
    );
  }

  persistPlan() {
    return savePlan({
      createdAt: this.planCreatedAt || Date.now(),
      settings: this.settings,
      rows: this.rows,
      sent: [...this.sent],
    }).catch(() => {});
  }

  async discardPlan() {
    this.rows = [];
    this.sent = new Set();
    this.notice('');
    this.renderRows();
    await clearPlan().catch(() => {});
  }

  destroy() {
    this.$(document).off('keydown.farmGod');
    this.$panel.remove();
  }
}
