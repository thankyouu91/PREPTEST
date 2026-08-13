/**
 * Audio storage with three interchangeable drivers.
 *
 * Why an adapter instead of writing straight to disk: the container this
 * platform runs in is disposable, so anything written to local disk is gone on
 * the next deploy. Local disk is still the right choice while developing —
 * no keys, no network, instant. So the call sites talk to one interface and
 * the driver is picked from the environment:
 *
 *   AUDIO_STORAGE=disk       (default) files under data/uploads/audio
 *   AUDIO_STORAGE=supabase   Supabase Storage bucket, survives redeploys
 *   AUDIO_STORAGE=gcs        Google Cloud Storage, for the Cloud Run deployment
 *
 * The Supabase driver needs SUPABASE_URL and SUPABASE_SERVICE_KEY. It uses the
 * service key, so it must only ever run on the server — never ship that key to
 * a browser.
 *
 * The GCS driver needs GCS_BUCKET and a Google credential, which on Cloud Run
 * is the attached service account and needs no key at all — see
 * server/google-token.js. It talks to the JSON API over `fetch`, so it adds no
 * dependency: the official client library is 200-odd transitive packages to do
 * three HTTP calls.
 *
 * Security notes, because this is the one place the platform accepts a file
 * from outside:
 *   · The client filename is never used. Keys are generated here.
 *   · Content type is checked AND the first bytes are sniffed, so renaming
 *     evil.exe to song.mp3 does not get through.
 *   · Size is capped before anything touches storage.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const googleToken = require('./google-token');

/* 10 MB is generous for a single test item: a 3 minute clip at 128 kbps is
   about 2.8 MB. Anything bigger is a mistake or an attack. */
const MAX_BYTES = 10 * 1024 * 1024;

/* Prompt audio is MP3 only: those files are uploaded by an admin who can save
   in whatever format is asked for, and one format keeps the player, the storage
   and the AI scoring path simple. */
const ACCEPTED_MIME = ['audio/mpeg', 'audio/mp3'];
const EXTENSION = 'mp3';

/* Candidate recordings are a different problem. A browser records with
   MediaRecorder, which produces WebM/Opus or Ogg/Opus — no browser encodes MP3,
   and converting server side would mean shipping ffmpeg. Gemini reads all three
   containers, so the recording is stored as produced and handed to the model as
   it is; refusing them would simply mean nobody can answer a speaking part.
   Sniffed on content like everything else, never on the declared type. */
const RECORDING_MIME = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/mp3'];

const DISK_ROOT = process.env.AUDIO_DIR || path.join(process.cwd(), 'data', 'uploads', 'audio');
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const SUPABASE_BUCKET = process.env.SUPABASE_AUDIO_BUCKET || 'exam-audio';

/* Read at call time rather than at import. The other settings above are read
   once because nothing changes them after boot; the driver choice is read per
   call so that a process can be told which driver to use after this module has
   already been loaded — which is exactly what the tests need in order to prove
   the selection rules, and costs nothing in production. */
const driverName_ = () => (process.env.AUDIO_STORAGE || 'disk').toLowerCase();

/* STORAGE_EMULATOR_HOST is the name Google's own client libraries read, so a
   fake server or the local emulator drops in without a project-specific knob. */
const gcs = () => ({
  bucket: process.env.GCS_BUCKET || '',
  api: (process.env.STORAGE_EMULATOR_HOST || 'https://storage.googleapis.com').replace(/\/+$/, ''),
  /* read_write covers get, put and delete of objects, and nothing else — not
     bucket administration, not IAM. */
  scope: 'https://www.googleapis.com/auth/devstorage.read_write'
});

/**
 * Is this really an MP3?
 *
 * Two legal openings: an ID3v2 tag ("ID3"), or a raw frame header whose sync
 * word is eleven set bits — 0xFF followed by a byte whose top three bits are
 * set. Checking the declared content type alone is not enough: that value is
 * chosen by whoever is uploading.
 */
function looksLikeMp3(buf) {
  if (!buf || buf.length < 3) return false;
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) return true;      // "ID3"
  return buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0;                          // frame sync
}

/**
 * Is this one of the containers a browser actually records into?
 *
 * WebM and Matroska both open with the EBML magic 1A 45 DF A3; Ogg opens with
 * the four bytes "OggS"; an MP4/M4A has "ftyp" at offset 4. MP3 counts too, for
 * a client that manages to produce one.
 */
function looksLikeRecording(buf) {
  if (!buf || buf.length < 12) return false;
  if (looksLikeMp3(buf)) return true;
  if (buf[0] === 0x1A && buf[1] === 0x45 && buf[2] === 0xDF && buf[3] === 0xA3) return true;   // EBML
  if (buf[0] === 0x4F && buf[1] === 0x67 && buf[2] === 0x67 && buf[3] === 0x53) return true;   // "OggS"
  if (buf.slice(4, 8).toString('latin1') === 'ftyp') return true;                              // MP4/M4A
  return false;
}

/** Reject anything we would not want to store, with a reason worth showing. */
function validate(buf, mime) {
  if (!buf || !buf.length) return 'Empty upload';
  if (buf.length > MAX_BYTES) return `File is larger than ${Math.round(MAX_BYTES / 1024 / 1024)} MB`;
  if (!ACCEPTED_MIME.includes(String(mime || '').toLowerCase().split(';')[0].trim())) {
    return 'Only MP3 audio is accepted';
  }
  if (!looksLikeMp3(buf)) return 'File does not look like an MP3';
  return null;
}

/* Keys are generated, never derived from the upload. Two levels of directory
   keep any one folder from growing to hundreds of thousands of entries. */
function newKey() {
  const id = crypto.randomBytes(16).toString('hex');
  return `${id.slice(0, 2)}/${id}.${EXTENSION}`;
}

/* Defence in depth: a key only ever comes from newKey(), but a stored value
   could be tampered with, so refuse anything that could climb out of the root. */
function safeKey(key) {
  return typeof key === 'string' && /^[0-9a-f]{2}\/[0-9a-f]{32}\.mp3$/.test(key);
}

/* ------------------------------ disk ------------------------------ */

const diskDriver = {
  name: 'disk',
  async put(buf, key) {
    const file = path.join(DISK_ROOT, key);
    await fs.promises.mkdir(path.dirname(file), { recursive: true });
    await fs.promises.writeFile(file, buf);
  },
  async get(key) {
    return { body: await fs.promises.readFile(path.join(DISK_ROOT, key)) };
  },
  async remove(key) {
    await fs.promises.rm(path.join(DISK_ROOT, key), { force: true });
  }
};

/* ---------------------------- supabase ---------------------------- */

function supabaseHeaders(extra) {
  return Object.assign({
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`
  }, extra || {});
}

const supabaseDriver = {
  name: 'supabase',
  async put(buf, key) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${key}`, {
      method: 'POST',
      headers: supabaseHeaders({ 'Content-Type': 'audio/mpeg', 'x-upsert': 'true' }),
      body: buf
    });
    if (!res.ok) throw new Error(`Supabase upload failed: ${res.status} ${await res.text()}`);
  },
  async get(key) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${key}`, {
      headers: supabaseHeaders()
    });
    if (!res.ok) throw new Error(`Supabase download failed: ${res.status}`);
    return { body: Buffer.from(await res.arrayBuffer()) };
  },
  async remove(key) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${key}`, {
      method: 'DELETE',
      headers: supabaseHeaders()
    });
    /* A missing object is not an error worth propagating: the caller wanted it
       gone and it is gone. */
    if (!res.ok && res.status !== 404) throw new Error(`Supabase delete failed: ${res.status}`);
  }
};

/* ------------------------------- gcs ------------------------------- *
 *
 * Three calls against the JSON API. The object name goes in the QUERY STRING on
 * upload and in the PATH on read and delete, and in the path it must be
 * percent-encoded whole — our keys contain a slash, and an unescaped one there
 * addresses a different object. The Supabase driver above does not encode,
 * correctly, because that API takes a real path.
 */

async function gcsHeaders(extra) {
  const token = await googleToken.accessToken(gcs().scope);
  return Object.assign({ Authorization: `Bearer ${token}` }, extra || {});
}

/** The body of a failed response, short enough to log and never the request. */
async function gcsReason(res) {
  const text = await res.text().catch(() => '');
  return `${res.status} ${text.slice(0, 200)}`;
}

const gcsDriver = {
  name: 'gcs',
  async put(buf, key) {
    const { api, bucket } = gcs();
    const url = `${api}/upload/storage/v1/b/${encodeURIComponent(bucket)}/o`
      + `?uploadType=media&name=${encodeURIComponent(key)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: await gcsHeaders({ 'Content-Type': 'audio/mpeg' }),
      body: buf
    });
    if (!res.ok) throw new Error(`GCS upload failed: ${await gcsReason(res)}`);
  },
  async get(key) {
    const { api, bucket } = gcs();
    const url = `${api}/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(key)}?alt=media`;
    const res = await fetch(url, { headers: await gcsHeaders() });
    if (!res.ok) throw new Error(`GCS download failed: ${await gcsReason(res)}`);
    return { body: Buffer.from(await res.arrayBuffer()) };
  },
  async remove(key) {
    const { api, bucket } = gcs();
    const url = `${api}/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(key)}`;
    const res = await fetch(url, { method: 'DELETE', headers: await gcsHeaders() });
    /* Same as Supabase: the caller wanted it gone and it is gone. */
    if (!res.ok && res.status !== 404) throw new Error(`GCS delete failed: ${await gcsReason(res)}`);
  }
};

/**
 * Which driver is in force, and what happens when a driver is asked for
 * without the credential it needs.
 *
 * Supabase throws. GCS does something more careful, because the roadmap asks
 * for it to "fall back to disk until the credential exists" and a silent
 * fallback in production is data loss rather than a graceful degradation:
 * writes would land on a container disk that evaporates on the next deploy,
 * and nobody would find out until a candidate's recording was missing.
 *
 * So it depends on where it is running. In production, an unconfigured GCS
 * refuses to start — a boot that fails is cheaper than an upload that
 * disappears. Anywhere else it warns, loudly and once, and uses disk, so the
 * same configuration can be run on a laptop with no key at all.
 */
let warnedAboutGcs = false;
function pickDriver() {
  const want = driverName_();
  if (want === 'supabase') {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('AUDIO_STORAGE=supabase needs SUPABASE_URL and SUPABASE_SERVICE_KEY');
    }
    return supabaseDriver;
  }
  if (want === 'gcs') {
    const missing = [];
    if (!gcs().bucket) missing.push('GCS_BUCKET');
    if (!googleToken.configured()) missing.push('a Google credential (GOOGLE_SERVICE_ACCOUNT_JSON, GOOGLE_APPLICATION_CREDENTIALS, or the metadata server on Cloud Run)');
    if (!missing.length) return gcsDriver;
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`AUDIO_STORAGE=gcs needs ${missing.join(' and ')}`);
    }
    if (!warnedAboutGcs) {
      warnedAboutGcs = true;
      console.warn(`[storage] AUDIO_STORAGE=gcs but ${missing.join(' and ')} is missing — using local disk. `
        + 'Uploads will not survive a redeploy. In production this would refuse to start.');
    }
    return diskDriver;
  }
  return diskDriver;
}

/* ------------------------------ api ------------------------------ */

/**
 * Store one audio file. Returns the generated key and its size; the caller
 * writes those onto whatever row owns the audio.
 */
async function put(buf, mime) {
  const bad = validate(buf, mime);
  if (bad) { const e = new Error(bad); e.code = 'INVALID_AUDIO'; throw e; }
  const key = newKey();
  await pickDriver().put(buf, key);
  return { key, bytes: buf.length, driver: pickDriver().name };
}

/**
 * Store a candidate's spoken answer.
 *
 * Same keys, same drivers, same size cap as prompt audio — only the accepted
 * containers differ, because this side of the platform takes what the browser
 * can produce rather than what an admin was asked to upload.
 */
async function putRecording(buf, mime) {
  if (!buf || !buf.length) { const e = new Error('Empty upload'); e.code = 'INVALID_AUDIO'; throw e; }
  if (buf.length > MAX_BYTES) {
    const e = new Error(`File is larger than ${Math.round(MAX_BYTES / 1024 / 1024)} MB`);
    e.code = 'INVALID_AUDIO'; throw e;
  }
  const declared = String(mime || '').toLowerCase().split(';')[0].trim();
  if (declared && !RECORDING_MIME.includes(declared)) {
    const e = new Error('Unsupported recording format'); e.code = 'INVALID_AUDIO'; throw e;
  }
  if (!looksLikeRecording(buf)) {
    const e = new Error('File does not look like an audio recording'); e.code = 'INVALID_AUDIO'; throw e;
  }
  const key = newKey();
  await pickDriver().put(buf, key);
  return { key, bytes: buf.length, driver: pickDriver().name };
}

/** Read one audio file back as a Buffer. */
async function get(key) {
  if (!safeKey(key)) { const e = new Error('Bad audio key'); e.code = 'INVALID_KEY'; throw e; }
  return pickDriver().get(key);
}

/** Delete one audio file. Safe to call for a key that is already gone. */
async function remove(key) {
  if (!safeKey(key)) return;
  await pickDriver().remove(key);
}

module.exports = {
  MAX_BYTES, ACCEPTED_MIME, RECORDING_MIME, EXTENSION,
  put, putRecording, get, remove,
  validate, looksLikeMp3, safeKey, newKey,
  /* Also the way a caller asks "would this work?", since it throws for a driver
     that is named but not configured. */
  driverName: () => pickDriver().name
};
