# FarmGod Planner

A Manifest V3 browser extension that does the farm-planning work of the
FarmGod userscript, without the bookmarklet.

The extension scans your villages, your in-flight attacks and the loot
assistant, works out which village should hit which target with which
template, and renders the result as a table. **Sending is left to you**: each
row goes out on its own click or Enter press, exactly as if you had clicked
the icon in the loot assistant yourself.

## Why an extension

The bookmarklet version has to be pasted on every page load, keeps one shared
settings blob for every world, and throws the whole plan away the moment the
page navigates. This version fixes those:

| | Bookmarklet | Extension |
|---|---|---|
| Startup | paste it each time | auto-injects on the loot assistant |
| Settings | one `localStorage` key for everything | one record per world *and* player |
| Plan survives a reload | no | yes, with an age warning |
| Crawl concurrency | 1 (see below) | configurable, 3 by default |
| Why so few rows? | unexplained | per-reason skip counts |

### The concurrency bug

The original library built five request lanes and then picked one with:

```js
let leastBusyQueue = twLib.queues.map(q => q.length)
  .reduce((next, curr) => (curr < next ? curr : next), 0);
```

That reduces to the smallest lane *length* and then uses that number as an
index. The accumulator starts at `0` and lengths are never negative, so the
result is always `0`: four of the five lanes were dead and every request ran
single-file. `src/page/lib.js` uses `indexOf(Math.min(...lengths))` instead, so
the pool actually reaches its configured width. Scanning is the slow part of a
run, and this is where the time went.

## Install

1. `chrome://extensions` → enable **Developer mode**
2. **Load unpacked** → pick this `farmgod-extension/` directory
3. Open the loot assistant (`screen=am_farm`) on any supported world

Firefox: `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on** →
pick `manifest.json`.

Requires a premium account with the loot assistant enabled, and templates A and
B configured — A small, B larger, since B is what gets sent at targets whose
last haul came back full.

If your market's domain is not in `manifest.json`, add it to
`host_permissions`, `content_scripts[0].matches` and
`web_accessible_resources[0].matches`, then reload the extension.

## What it will not do

It does not send attacks on its own. There is no timer, no interval, no
auto-clicker, and no randomised delay to hide one. Planning is automated
because reading pages and doing arithmetic is what a computer is for; dispatch
stays manual because that is the line Tribal Wars draws between an assistant
and a bot, and crossing it gets accounts banned. The constraint is written down
at the top of `src/page/ui.js` — please leave it there.

## Layout

```
manifest.json
src/content/bridge.js   isolated world: injects the page module, serves chrome.storage
src/page/rpc.js         promise wrapper over the postMessage bridge
src/page/store.js       settings / plan / unit-speed persistence, scoped per world+player
src/page/lib.js         request pool, paged crawler, server-time parsing
src/page/scraper.js     reads villages, commands, templates and farms out of the DOM
src/page/planner.js     pure planning algorithm — no DOM, no network
src/page/ui.js          panel, table, and the one-gesture-per-attack send path
src/page/main.js        bootstrap
src/popup/              language and concurrency preferences
test/planner.test.mjs   unit tests for the planner
```

## Tests

```
npm test
```

`planner.js` is deliberately free of browser globals so the scheduling rules —
nearest-first ordering, troop depletion, arrival spacing, template choice,
the stricter rule for freshly discovered barbarians — are covered by ordinary
node tests.

## How planning works

For each of your villages, targets are sorted by distance and claimed greedily
from the closest outward. A target is taken when all three hold:

- the village still has the template's troops (`subtractArrays` returns non-null)
- the distance is under your field limit
- no attack — in flight *or* already planned this run — lands within your
  spacing window

Two pieces of running state keep the greedy pass honest without backtracking:
the village's troop count shrinks as it claims targets, and each claim pushes
its projected arrival onto that target's schedule, so later villages see it.

Arrivals get a one-second stagger per five planned attacks, otherwise a cluster
of equidistant targets would land on one timestamp and slip through the spacing
check.

Rows that fail one of the three conditions are counted by reason and shown
under the progress line, so "why did it only plan 12 farms" has an answer:
usually template A is too big, or the spacing window is wider than you think.
