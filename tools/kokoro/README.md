# Kokoro — building the exam audio

Apache-2.0, runs on CPU, needs no API key and no network at render time.

Set up once per machine, then `node scripts/dung-audio-kokoro.mjs` builds the
whole bank.

---

## Why this is a build-time tool and not a provider

[`docs/VOICE.md`](../../docs/VOICE.md) §4.1 already decided that audio is
rendered when an item is authored and played from storage during the exam.
Nothing calls a TTS engine while a candidate is sitting a test.

So Kokoro never ships to Cloud Run. It is a 338 MB model on an author's
machine, the deployed container is unchanged, and the Node project still has
exactly one dependency. The cost is that building audio is something you do
deliberately rather than something the server can do on request — which is the
right shape for an artefact two candidates must hear identically.

---

## Install

```bash
mkdir -p ~/.kokoro && cd ~/.kokoro

uv venv venv --python 3.11
uv pip install --python venv/bin/python kokoro-onnx soundfile lameenc

curl -sSL -O https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
curl -sSL -O https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
```

311 MB model, 27 MB voices. Both live outside the repository on purpose —
they are not source, and every machine fetches them once.

Override the location with `KOKORO_HOME`, or point at a different interpreter
with `KOKORO_PYTHON`.

Check it:

```bash
node scripts/dung-audio-kokoro.mjs --thu
```

---

## Build

```bash
node scripts/dung-audio-kokoro.mjs --thu           # what would be built
node scripts/dung-audio-kokoro.mjs                 # build what is missing
node scripts/dung-audio-kokoro.mjs --part=E        # one part
node scripts/dung-audio-kokoro.mjs --lam-lai       # rebuild everything
node scripts/dung-audio-kokoro.mjs --giong=am_michael --toc-do=1.1
```

Items are hashed on script + voice + speed, so a second run skips anything
unchanged. Editing one script rebuilds one file.

Everything lands at `audio_status = 'ready'`, **not** `approved`. Somebody
still has to listen. The publish gate in `server/api.js` requires approved
audio, so this command alone cannot put a paper in front of a candidate.

---

## The pauses are spliced here, not asked for

Kokoro is not an SSML engine. Hand it `<break time="1.0s" />` and it reads the
tag aloud — measured, not assumed:

```
the tag alone → 2.47 s of audio, RMS 0.106     (silence would be RMS ≈ 0)
```

Passing `parsed.text` straight through would put a voice saying *"break time
one point zero s"* into the middle of every listening item in the bank.

So `dung-audio-kokoro.mjs` sends `segments` from
[`server/script-markup.js`](../../server/script-markup.js) — the same ordered
list of speech and pause that the preview screen draws — and `render.py`
synthesises each speech run and lays down exact digital silence between them.

**This is better than the alternative, not a workaround.** With a hosted engine
a `<break>` is a request the model interprets, and two renders of one script
can differ. Here 1000 ms is 24 000 samples of zero, every time. For an exam
where two candidates must hear the same thing, exact beats expressive.

It also means the platform's own pacing rules apply unchanged: the one-second
lead-in, 300 ms after a comma, 800 ms after a full stop.

---

## Speed

`--toc-do` defaults to **1.25**, which is what the owner asked for. Kokoro
takes any rate; ElevenLabs caps `speed` at 1.2, which is why the hosted path
clamps and this one does not.

---

## Voices

54 available. `bf_emma` (British female) is the default for VPET. `b` is
British, `a` American; `f` female, `m` male.

Whichever is chosen, **use one voice for a whole form**. A dictation part read
by two different speakers is measuring something nobody designed.

```bash
~/.kokoro/venv/bin/python -c "
from kokoro_onnx import Kokoro
print(Kokoro('$HOME/.kokoro/kokoro-v1.0.onnx','$HOME/.kokoro/voices-v1.0.bin').get_voices())"
```

---

## Licence

Kokoro-82M is Apache-2.0 — commercial use allowed, no attribution burden on
the audio it produces. `kokoro-onnx` is MIT. `lameenc` wraps LAME (LGPL),
linked dynamically and used only as a build tool, so nothing LGPL ships in the
deployed container.

Worth stating because it is the reason this was chosen over the alternatives:
**edge-tts** is free and good but calls an undocumented Microsoft endpoint
meant for the Edge browser's read-aloud feature, which is not a licence to run
a paid exam product on it. **XTTS-v2** is under Coqui's public model licence,
which forbids commercial use.
