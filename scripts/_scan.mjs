/**
 * Enough of a JavaScript scanner to tell code from not-code.
 *
 * Used by scripts/test-async.mjs to read the server source without pulling in a
 * parser. Not a parser itself: it skips comments, strings, template literals
 * and regex literals, and matches brackets. That is all a static check of call
 * sites needs.
 *
 * The trap worth naming, because it cost a pass of the migration this was
 * written for: a regex literal can contain a quote — `/[.,;:!?'"()]+/g` in
 * server/marking.js — and a scanner that reads that quote as the start of a
 * string desynchronises for the rest of the file. Everything after it looks
 * like the inside of a string, so every call is quietly skipped and the check
 * passes by finding nothing.
 */

const REGEX_OK_CHARS = new Set([...'(,=:[!&|?{};+-*%~^<>\n', undefined]);
const REGEX_OK_WORDS = new Set(['return', 'typeof', 'case', 'in', 'of', 'new', 'delete', 'void', 'do', 'else', 'yield', 'await']);

function regexAllowed(s, i) {
  let j = i - 1;
  while (j >= 0 && /\s/.test(s[j])) j--;
  if (j < 0) return true;
  if (REGEX_OK_CHARS.has(s[j])) return true;
  if (!/[\w$]/.test(s[j])) return false;
  let e = j + 1;
  while (j >= 0 && /[\w$]/.test(s[j])) j--;
  return REGEX_OK_WORDS.has(s.slice(j + 1, e));
}

function matchBraceRaw(s, open) {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    const n = skipLiteral(s, i);
    if (n >= 0) { i = n - 1; continue; }
    if (s[i] === '{') depth++;
    else if (s[i] === '}') { depth--; if (depth === 0) return i; }
  }
  return -1;
}

/** Index just past the comment/string/template/regex starting at `i`, or -1. */
export function skipLiteral(s, i) {
  const c = s[i];
  if (c === '/' && s[i + 1] === '/') { const e = s.indexOf('\n', i); return e < 0 ? s.length : e; }
  if (c === '/' && s[i + 1] === '*') { const e = s.indexOf('*/', i); return e < 0 ? s.length : e + 2; }
  if (c === '/' && regexAllowed(s, i)) {
    let j = i + 1, cls = false;
    for (; j < s.length; j++) {
      const d = s[j];
      if (d === '\\') { j++; continue; }
      if (d === '\n') return -1;                       // an unterminated regex is division
      if (d === '[') cls = true;
      else if (d === ']') cls = false;
      else if (d === '/' && !cls) break;
    }
    if (j >= s.length) return -1;
    j++;
    while (j < s.length && /[a-z]/.test(s[j])) j++;    // flags
    return j;
  }
  if (c === "'" || c === '"') {
    for (let j = i + 1; j < s.length; j++) {
      if (s[j] === '\\') j++;
      else if (s[j] === c) return j + 1;
      else if (s[j] === '\n') return -1;
    }
    return s.length;
  }
  if (c === '`') {
    for (let j = i + 1; j < s.length; j++) {
      if (s[j] === '\\') { j++; continue; }
      if (s[j] === '`') return j + 1;
      if (s[j] === '$' && s[j + 1] === '{') { const e = matchBraceRaw(s, j + 1); if (e < 0) return s.length; j = e; }
    }
    return s.length;
  }
  return -1;
}

/** True when `at` is inside a comment or a literal rather than in code. */
export function inLiteral(s, at) {
  for (let i = 0; i < at;) {
    const n = skipLiteral(s, i);
    if (n < 0) { i++; continue; }
    if (n > at) return true;
    i = n;
  }
  return false;
}

/** Index of the `)` matching the `(` at `open`. */
export function matchParen(s, open) {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    const n = skipLiteral(s, i);
    if (n >= 0) { i = n - 1; continue; }
    if (s[i] === '(') depth++;
    else if (s[i] === ')') { depth--; if (depth === 0) return i; }
  }
  return -1;
}
