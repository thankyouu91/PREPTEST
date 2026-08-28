/**
 * Pure farm-planning logic. No DOM, no network, no browser globals — so it can
 * be unit-tested under node and reasoned about on its own.
 *
 * Design note: this module only ever *plans*. Turning a plan into attacks is
 * the job of ui.js, which requires one user gesture per attack. Nothing here
 * schedules, times, or dispatches anything.
 */

/** Euclidean distance between two "x|y" coordinates, in fields. */
export function getDistance(a, b) {
  const [ax, ay] = a.split('|').map(Number);
  const [bx, by] = b.split('|').map(Number);
  return Math.hypot(ax - bx, ay - by);
}

/**
 * have - need, elementwise. Returns null when the village cannot cover the
 * template, which is what makes "do I have enough troops" a single check.
 */
export function subtractArrays(have, need) {
  const out = have.map((v, i) => v - (need[i] || 0));
  return out.some((v) => v < 0) ? null : out;
}

/**
 * Greedy nearest-first planner.
 *
 * For every one of your villages, walk its farm targets from closest to
 * furthest and claim the ones you can still pay for. Two pieces of state make
 * the greedy pass correct without backtracking:
 *   - troops[origin] shrinks as targets are claimed, so a village stops
 *     planning once it runs dry;
 *   - schedule[target] gains the projected arrival, so later villages see
 *     already-planned attacks the same way they see in-flight ones.
 *
 * @param {object} data
 *   villages  {"x|y": {id, name, units:number[]}}
 *   commands  {"x|y": number[]}  arrival timestamps (seconds) of in-flight attacks
 *   farms     {"x|y": {id, color?:string, max_loot?:boolean}}
 *   templates {a:{id,units,speed}, b:{id,units,speed}}  speed = minutes per field
 * @param {object} options {maxFields, minMinutesBetween, useMaxLoot}
 * @param {number} serverTimeSec current server time, seconds
 */
export function createPlanning(data, options, serverTimeSec) {
  const { maxFields, minMinutesBetween, useMaxLoot } = options;
  const spacingSec = Math.round(minMinutesBetween * 60);

  const plan = {
    rows: [],
    byOrigin: {},
    counter: 0,
    skipped: { tooFar: 0, noTroops: 0, tooSoon: 0, noTemplate: 0 },
  };

  // Work on copies: callers keep their scraped data intact for a re-plan.
  const troops = {};
  for (const [coord, v] of Object.entries(data.villages)) {
    troops[coord] = v.units.slice();
  }
  const schedule = {};
  for (const [coord, list] of Object.entries(data.commands || {})) {
    schedule[coord] = list.slice();
  }

  const farmCoords = Object.keys(data.farms);

  for (const origin of Object.keys(data.villages)) {
    const ordered = farmCoords
      .map((coord) => ({ coord, dis: getDistance(origin, coord) }))
      .sort((a, b) => a.dis - b.dis);

    for (const { coord, dis } of ordered) {
      if (dis >= maxFields) {
        plan.skipped.tooFar += 1;
        continue;
      }

      const farm = data.farms[coord];
      const name = useMaxLoot && farm.max_loot ? 'b' : 'a';
      const template = data.templates[name] || data.templates.a;
      if (!template) {
        plan.skipped.noTemplate += 1;
        continue;
      }

      const left = subtractArrays(troops[origin], template.units);
      if (!left) {
        plan.skipped.noTroops += 1;
        continue;
      }

      // +counter/5 staggers arrivals by a second per five planned attacks, so a
      // burst of same-distance targets does not collapse onto one timestamp and
      // defeat the spacing check below.
      const arrival = Math.round(
        serverTimeSec + dis * template.speed * 60 + Math.round(plan.counter / 5)
      );

      const existing = schedule[coord] || (schedule[coord] = []);
      // A target with no dot colour never appeared in the loot assistant, i.e.
      // it is a freshly discovered barbarian village. Any attack already flying
      // at it is reason enough to leave it alone this round.
      const isUnseen = !Object.prototype.hasOwnProperty.call(farm, 'color');
      const clashes =
        (isUnseen && existing.length > 0) ||
        existing.some((ts) => Math.abs(ts - arrival) < spacingSec);
      if (clashes) {
        plan.skipped.tooSoon += 1;
        continue;
      }

      const village = data.villages[origin];
      const row = {
        id: `${village.id}-${farm.id}`,
        origin: { coord: origin, id: village.id, name: village.name },
        target: { coord, id: farm.id },
        fields: dis,
        template: { name, id: template.id },
        arrival,
      };

      plan.rows.push(row);
      (plan.byOrigin[origin] || (plan.byOrigin[origin] = [])).push(row);
      plan.counter += 1;
      troops[origin] = left;
      existing.push(arrival);
    }
  }

  return plan;
}
