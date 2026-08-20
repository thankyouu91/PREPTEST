/**
 * Sealing a secret before it goes in the database.
 *
 * Two things on this platform are secrets that the SERVER has to be able to read
 * back: a Google refresh token, and now the API key for whichever model marks
 * the writing and speaking. Neither can be hashed - a hash proves a guess, and
 * what is needed here is the value itself.
 *
 * So: AES-256-GCM under one key from the environment. GCM rather than CBC
 * because the tag makes a tampered row fail to open rather than decrypt into
 * something. The format is `iv.ciphertext.tag`, all base64url, which is one
 * column and no schema of its own.
 *
 * This used to live inside server/classroom.js. It moved out the day a second
 * caller appeared, before the copy could be made - two implementations of the
 * same envelope is how a database ends up with rows only one of them can open.
 *
 * What this does NOT protect against: someone who has both the database and
 * TOKEN_ENCRYPTION_KEY. It protects against the far likelier pair - a database
 * copy, a backup, a support dump - travelling without the key.
 */
'use strict';

const crypto = require('crypto');

/**
 * The key, or null. 32 bytes, base64 - generate one with:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 *
 * A wrong length throws rather than being padded or hashed into shape: a key
 * that is quietly stretched is a key nobody can reproduce later, and the day
 * that matters is the day the database has to be read on another machine.
 *
 * Read at call time, never captured into a constant - server/secrets.js merges
 * AWS Secrets Manager into the environment during boot, and a module that
 * snapshotted this at import time would hold the value from before that ran.
 * scripts/test-secrets.mjs enforces that rule by reading the source.
 */
function encryptionKey() {
  const raw = process.env.TOKEN_ENCRYPTION_KEY || '';
  if (!raw) return null;
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be exactly 32 bytes, base64 encoded');
  }
  return key;
}

/** True when a secret can be stored at all. Ask before offering the form. */
function canSeal() {
  try { return !!encryptionKey(); } catch (e) { return false; }
}

/** iv.ciphertext.tag, all base64url. */
function seal(plaintext, what) {
  const key = encryptionKey();
  if (!key) throw new Error('TOKEN_ENCRYPTION_KEY is not set, so ' + (what || 'a secret') + ' cannot be stored');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  return [iv, body, cipher.getAuthTag()].map(b => b.toString('base64url')).join('.');
}

function open(sealed, what) {
  const key = encryptionKey();
  if (!key) throw new Error('TOKEN_ENCRYPTION_KEY is not set, so ' + (what || 'a stored secret') + ' cannot be read');
  const parts = String(sealed || '').split('.');
  if (parts.length !== 3) throw new Error('The stored value is not in the expected format');
  const [iv, body, tag] = parts.map(p => Buffer.from(p, 'base64url'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8');
}

/**
 * The last four characters, for a screen that has to show WHICH key is in use
 * without showing the key. Anything shorter than eight is reported as set and
 * nothing else - a four-character secret is short enough that four characters
 * of it is most of it.
 */
function hint(secret) {
  const s = String(secret || '');
  return s.length >= 8 ? s.slice(-4) : '';
}

module.exports = { encryptionKey, canSeal, seal, open, hint };
