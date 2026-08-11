/**
 * Provider API keys — entered in the admin dashboard, encrypted at rest.
 *
 * Two keys matter to this platform: ElevenLabs renders the exam audio and
 * OpenAI marks the speaking answers and drafts items. Both are entered by an
 * administrator rather than shipped in the environment, because the people who
 * run a centre are not the people who deploy the container.
 *
 * That convenience has a cost worth being explicit about: a key in the database
 * is a key in every database backup. So the value is encrypted with AES-256-GCM
 * before it is stored, and the encryption key lives outside the database:
 *
 *   1. APP_SECRET in the environment  — the production answer. On Google Cloud
 *      this comes from Secret Manager and never touches disk.
 *   2. data/.app-secret, mode 0600    — generated on first use when APP_SECRET
 *      is unset, so development works with no setup. A leaked SQL dump is still
 *      useless on its own; someone needs the filesystem too.
 *
 * Environment variables win over stored values. A production deployment can set
 * ELEVENLABS_API_KEY / OPENAI_API_KEY from Secret Manager and the database copy
 * is ignored entirely — no migration, no admin action, no surprise.
 *
 * Nothing here ever returns a full key to a browser. The admin screen gets
 * `configured: true` and the last four characters, which is enough to tell two
 * keys apart and useless to anyone who intercepts it.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const { q } = require('./db');

const DATA_DIR = path.join(process.cwd(), 'data');
const SECRET_FILE = path.join(DATA_DIR, '.app-secret');

/* Every provider the platform can hold a key for. Adding one is a line here
   plus a field in the admin screen — the routes are generic. */
const PROVIDERS = {
  elevenlabs: {
    label: 'ElevenLabs',
    env: 'ELEVENLABS_API_KEY',
    /* Long enough to be a real key, short enough to catch a paste that grabbed
       half the clipboard. Not a format check — providers change formats. */
    min: 20,
    max: 200
  },
  openai: {
    label: 'OpenAI',
    env: 'OPENAI_API_KEY',
    min: 20,
    max: 300
  }
};

const settingKey = name => `secret.${name}.api_key`;

/* ------------------------------------------------------------------ */

let cachedMasterKey = null;

/**
 * The key that encrypts the stored keys.
 *
 * Derived rather than used raw so an APP_SECRET that happens to be a short
 * passphrase still yields 32 bytes. The salt is fixed and public — its job here
 * is domain separation, not password stretching, and there is exactly one
 * secret per deployment to derive from.
 */
function masterKey() {
  if (cachedMasterKey) return cachedMasterKey;

  let source = process.env.APP_SECRET || '';
  if (!source) {
    try {
      source = fs.readFileSync(SECRET_FILE, 'utf8').trim();
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
  }
  if (!source) {
    source = crypto.randomBytes(32).toString('hex');
    fs.mkdirSync(DATA_DIR, { recursive: true });
    /* 0600 before anything is written, not after — a world-readable window,
       however brief, defeats the point. */
    fs.writeFileSync(SECRET_FILE, source + '\n', { mode: 0o600 });
    console.warn(
      '[secrets] APP_SECRET was not set, so a key was generated in data/.app-secret.\n' +
      '          Fine for development. In production set APP_SECRET from Secret Manager,\n' +
      '          otherwise the stored provider keys are lost when the container is replaced.'
    );
  }

  cachedMasterKey = crypto.scryptSync(source, 'preptest.secrets.v1', 32);
  return cachedMasterKey;
}

function encrypt(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey(), iv);
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  /* v1: iv.ciphertext.tag, all base64url. The version prefix is what lets a
     future scheme decrypt old values instead of throwing on them. */
  return ['v1', iv.toString('base64url'), body.toString('base64url'),
    cipher.getAuthTag().toString('base64url')].join('.');
}

function decrypt(blob) {
  const parts = String(blob || '').split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') return null;
  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm', masterKey(), Buffer.from(parts[1], 'base64url'));
    decipher.setAuthTag(Buffer.from(parts[3], 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(parts[2], 'base64url')), decipher.final()
    ]).toString('utf8');
  } catch (e) {
    /* Wrong master key, or a tampered row. Either way the value is unusable and
       the caller should behave exactly as if no key were configured — the admin
       screen then offers to re-enter it, which is the only real fix. */
    console.error('[secrets] could not decrypt a stored key; treating it as unset');
    return null;
  }
}

/* ------------------------------------------------------------------ */

/** Show enough to identify a key, not enough to use one. */
function mask(value) {
  const v = String(value || '');
  if (v.length <= 4) return '••••';
  return '••••••••' + v.slice(-4);
}

/** The usable key, or '' when none is configured. Server-side callers only. */
function get(name) {
  const spec = PROVIDERS[name];
  if (!spec) throw new Error(`unknown provider: ${name}`);

  const fromEnv = (process.env[spec.env] || '').trim();
  if (fromEnv) return fromEnv;

  const row = q.get('SELECT value FROM settings WHERE key=?', settingKey(name));
  return row ? (decrypt(row.value) || '') : '';
}

function set(name, value) {
  const spec = PROVIDERS[name];
  if (!spec) throw new Error(`unknown provider: ${name}`);

  const v = String(value || '').trim();
  if (v.length < spec.min) return { ok: false, error: `${spec.label} key looks too short.` };
  if (v.length > spec.max) return { ok: false, error: `${spec.label} key looks too long.` };
  /* Whitespace inside a key is always a bad paste, and the resulting 401 from
     the provider is a far worse error message than this one. */
  if (/\s/.test(v)) return { ok: false, error: `${spec.label} key contains a space — check the paste.` };

  q.run('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
    settingKey(name), encrypt(v));
  return { ok: true, masked: mask(v) };
}

function clear(name) {
  if (!PROVIDERS[name]) throw new Error(`unknown provider: ${name}`);
  q.run('DELETE FROM settings WHERE key=?', settingKey(name));
}

/** Everything the admin screen is allowed to know. Never includes a key. */
function status() {
  return Object.entries(PROVIDERS).map(([name, spec]) => {
    const fromEnv = (process.env[spec.env] || '').trim();
    const value = fromEnv || get(name);
    return {
      name,
      label: spec.label,
      configured: !!value,
      masked: value ? mask(value) : '',
      /* A key from the environment cannot be edited here, and saying so beats
         letting an admin type a new one and watch it have no effect. */
      source: fromEnv ? 'env' : (value ? 'dashboard' : 'none'),
      envVar: spec.env
    };
  });
}

module.exports = { PROVIDERS, get, set, clear, status, mask };
