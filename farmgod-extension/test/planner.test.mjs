import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlanning, getDistance, subtractArrays } from '../src/page/planner.js';

const T0 = 1_700_000_000;

// speed is minutes per field; 10 = light cavalry-ish, 18 = spear-ish
const templates = {
  a: { id: 1, units: [10, 0, 0, 0, 0, 0, 0, 0], speed: 18 },
  b: { id: 2, units: [50, 0, 0, 0, 0, 0, 0, 0], speed: 18 },
};

const village = (id, name, units) => ({ id, name, units });
const opts = (o = {}) => ({
  maxFields: 25,
  minMinutesBetween: 10,
  useMaxLoot: true,
  ...o,
});

test('getDistance is euclidean over "x|y" coords', () => {
  assert.equal(getDistance('500|500', '503|504'), 5);
  assert.equal(getDistance('500|500', '500|500'), 0);
});

test('subtractArrays returns null when any unit would go negative', () => {
  assert.deepEqual(subtractArrays([10, 5], [4, 5]), [6, 0]);
  assert.equal(subtractArrays([10, 5], [4, 6]), null);
});

test('plans nearest targets first and stops when troops run out', () => {
  const data = {
    villages: { '500|500': village(1, 'Home', [25, 0, 0, 0, 0, 0, 0, 0]) },
    commands: {},
    farms: {
      '500|510': { id: 91, color: 'green' }, // 10 fields
      '500|502': { id: 92, color: 'green' }, // 2 fields
      '500|505': { id: 93, color: 'green' }, // 5 fields
    },
    templates,
  };

  const plan = createPlanning(data, opts(), T0);

  // 25 spears / 10 per template = 2 attacks, and they go to the two closest.
  assert.equal(plan.counter, 2);
  assert.deepEqual(
    plan.rows.map((r) => r.target.coord),
    ['500|502', '500|505']
  );
  assert.equal(plan.skipped.noTroops, 1);
});

test('respects maxFields', () => {
  const data = {
    villages: { '500|500': village(1, 'Home', [100, 0, 0, 0, 0, 0, 0, 0]) },
    commands: {},
    farms: {
      '500|505': { id: 91, color: 'green' }, // 5 fields  -> in
      '500|530': { id: 92, color: 'green' }, // 30 fields -> out
    },
    templates,
  };

  const plan = createPlanning(data, opts({ maxFields: 25 }), T0);
  assert.equal(plan.counter, 1);
  assert.equal(plan.rows[0].target.coord, '500|505');
  assert.equal(plan.skipped.tooFar, 1);
});

test('skips a target whose in-flight attack lands inside the spacing window', () => {
  const arrival = T0 + 5 * 18 * 60; // exactly when our own attack would land
  const data = {
    villages: { '500|500': village(1, 'Home', [100, 0, 0, 0, 0, 0, 0, 0]) },
    commands: { '500|505': [arrival] },
    farms: { '500|505': { id: 91, color: 'green' } },
    templates,
  };

  assert.equal(createPlanning(data, opts({ minMinutesBetween: 10 }), T0).counter, 0);
  // Widen nothing, shrink the window instead: the clash disappears.
  assert.equal(createPlanning(data, opts({ minMinutesBetween: 0 }), T0).counter, 1);
});

test('two equidistant villages do not double-book the same target', () => {
  // Both 5 fields out, so both would land at the same moment.
  const data = {
    villages: {
      '500|500': village(1, 'A', [100, 0, 0, 0, 0, 0, 0, 0]),
      '500|510': village(2, 'B', [100, 0, 0, 0, 0, 0, 0, 0]),
    },
    commands: {},
    farms: { '500|505': { id: 91, color: 'green' } },
    templates,
  };

  const plan = createPlanning(data, opts(), T0);
  assert.equal(plan.counter, 1);
  assert.equal(plan.skipped.tooSoon, 1);
});

test('villages at different distances may both hit a target when arrivals spread out', () => {
  // 5 fields vs 15 fields is 180 minutes apart, far outside a 10-minute window.
  const data = {
    villages: {
      '500|500': village(1, 'A', [100, 0, 0, 0, 0, 0, 0, 0]),
      '500|520': village(2, 'B', [100, 0, 0, 0, 0, 0, 0, 0]),
    },
    commands: {},
    farms: { '500|505': { id: 91, color: 'green' } },
    templates,
  };

  assert.equal(createPlanning(data, opts(), T0).counter, 2);
  // Widening the window to four hours collapses them back to one.
  assert.equal(createPlanning(data, opts({ minMinutesBetween: 240 }), T0).counter, 1);
});

test('uses template b only for max_loot targets, and only when asked', () => {
  const data = () => ({
    villages: { '500|500': village(1, 'Home', [60, 0, 0, 0, 0, 0, 0, 0]) },
    commands: {},
    farms: { '500|505': { id: 91, color: 'green', max_loot: true } },
    templates,
  });

  assert.equal(createPlanning(data(), opts({ useMaxLoot: true }), T0).rows[0].template.name, 'b');
  assert.equal(createPlanning(data(), opts({ useMaxLoot: false }), T0).rows[0].template.name, 'a');
});

test('a freshly discovered barb with any attack already flying is left alone', () => {
  const base = {
    villages: { '500|500': village(1, 'Home', [100, 0, 0, 0, 0, 0, 0, 0]) },
    // far outside the 10-minute spacing window, so only the "unseen" rule can reject it
    commands: { '500|505': [T0 + 86400] },
    templates,
  };

  const unseen = createPlanning({ ...base, farms: { '500|505': { id: 91 } } }, opts(), T0);
  assert.equal(unseen.counter, 0);
  assert.equal(unseen.skipped.tooSoon, 1);

  const known = createPlanning(
    { ...base, farms: { '500|505': { id: 91, color: 'green' } } },
    opts(),
    T0
  );
  assert.equal(known.counter, 1);
});

test('does not mutate the caller\'s scraped data, so re-planning is safe', () => {
  const data = {
    villages: { '500|500': village(1, 'Home', [25, 0, 0, 0, 0, 0, 0, 0]) },
    commands: {},
    farms: { '500|505': { id: 91, color: 'green' } },
    templates,
  };

  const first = createPlanning(data, opts(), T0);
  const second = createPlanning(data, opts(), T0);

  assert.deepEqual(data.villages['500|500'].units, [25, 0, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(data.commands, {});
  assert.equal(first.counter, second.counter);
});

test('row ids are stable, which is what lets a saved plan survive a reload', () => {
  const data = {
    villages: { '500|500': village(7, 'Home', [100, 0, 0, 0, 0, 0, 0, 0]) },
    commands: {},
    farms: { '500|505': { id: 91, color: 'green' } },
    templates,
  };

  assert.equal(createPlanning(data, opts(), T0).rows[0].id, '7-91');
  assert.equal(createPlanning(data, opts(), T0 + 999).rows[0].id, '7-91');
});
