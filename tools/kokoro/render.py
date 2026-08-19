"""
Render one exam script to MP3 with Kokoro, splicing the pauses ourselves.

Reads a JSON job on stdin, writes MP3 bytes on stdout. Nothing else: no
database, no network, no knowledge of the platform. The Node side decides what
to render and what to do with the bytes.

---------------------------------------------------------------------------
WHY THE PAUSES ARE SPLICED RATHER THAN ASKED FOR

Kokoro is not an SSML engine. Hand it `<break time="1.0s" />` and it reads the
tag out loud — measured, not assumed: the tag alone renders 2.5 seconds of
speech at RMS 0.106. Passing our marked-up text straight through would put a
voice saying "break time one point zero s" into the middle of every listening
item in the bank.

So the Node side sends `segments` from server/script-markup.js — the same
ordered list of speech and pause the preview screen draws — and this script
synthesises the speech and inserts exact digital silence for the pauses.

That is not a workaround. It is better than the alternative: with ElevenLabs a
`<break>` is a request the model interprets, and two renders of the same script
can differ. Here a 1000 ms pause is 24000 samples of zero, every time. For an
exam where two candidates must hear identical audio, exact beats expressive.
---------------------------------------------------------------------------

Kokoro is Apache-2.0, runs on CPU, and needs no key and no network at render
time. It is a build-time tool: docs/VOICE.md 4.1 already says audio is rendered
when an item is authored and played from storage during the exam, so none of
this ships to Cloud Run.
"""
import json
import sys

import numpy as np


def load_model(model_path, voices_path):
    from kokoro_onnx import Kokoro
    return Kokoro(model_path, voices_path)


def render(job, model=None):
    """job → (mp3 bytes, sample rate, duration in seconds)

    `model` lets the batch path hand in an already-loaded model; left out, one
    is loaded for this job alone, which is what the single-job path wants.
    """
    if model is None:
        model = load_model(job["model"], job["voices"])
    voice = job.get("voice", "bf_emma")
    speed = float(job.get("speed", 1.25))
    lang = job.get("lang", "en-gb")

    chunks = []
    rate = None

    for seg in job["segments"]:
        if seg["kind"] == "pause":
            # Rate is not known until the first speech segment comes back, so a
            # leading pause is held over and laid down once we know it.
            chunks.append(("pause", int(seg["ms"])))
            continue

        text = seg.get("text", "").strip()
        if not text:
            continue
        samples, sr = model.create(text, voice=voice, speed=speed, lang=lang)
        rate = sr
        chunks.append(("speech", np.asarray(samples, dtype=np.float32)))

    if rate is None:
        raise ValueError("nothing to speak: every segment was a pause or empty")

    out = []
    for kind, payload in chunks:
        if kind == "pause":
            out.append(np.zeros(int(rate * payload / 1000), dtype=np.float32))
        else:
            out.append(payload)

    audio = np.concatenate(out) if out else np.zeros(0, dtype=np.float32)

    # Clip before converting: a sample above 1.0 wraps to a loud click when it
    # becomes int16, and a click in a dictation item sounds like a consonant.
    audio = np.clip(audio, -1.0, 1.0)
    pcm = (audio * 32767).astype(np.int16)

    import lameenc
    enc = lameenc.Encoder()
    enc.set_bit_rate(int(job.get("bitrate", 128)))
    enc.set_in_sample_rate(int(rate))
    enc.set_channels(1)
    enc.set_quality(2)          # 0 best, 9 worst; 2 is transparent for speech
    mp3 = enc.encode(pcm.tobytes()) + enc.flush()

    return mp3, rate, len(audio) / rate


def render_batch(job):
    """Many scripts, one model load.

    The single-job path above loads a 325 MB ONNX model, speaks one sentence and
    exits. That costs about 37 seconds, of which the speaking is a few — so a
    bank of 175 items spends an hour and a half loading the same file 175 times.

    Batch mode takes {"batch": [{"id": ..., "segments": [...]}, ...]}, loads once
    and writes each MP3 to its own file under `outDir`, reporting one JSON line
    per item on stderr as it goes. Files rather than stdout because the caller
    needs to tell the results apart, and concatenated MP3 bytes cannot be split
    back into items.

    One failure does not stop the run: an item that raises is reported with its
    error and the rest continue. Re-rendering 174 good items to fix one bad
    script is exactly the waste this mode exists to avoid.
    """
    import os

    model = load_model(job["model"], job["voices"])
    out_dir = job["outDir"]
    os.makedirs(out_dir, exist_ok=True)

    voice = job.get("voice", "bf_emma")
    speed = float(job.get("speed", 1.25))
    lang = job.get("lang", "en-gb")
    bitrate = int(job.get("bitrate", 128))

    for item in job["batch"]:
        one = {
            "model": job["model"], "voices": job["voices"],
            "voice": item.get("voice", voice),
            "speed": float(item.get("speed", speed)),
            "lang": item.get("lang", lang),
            "bitrate": bitrate,
            "segments": item["segments"],
        }
        try:
            mp3, rate, seconds = render(one, model=model)
        except Exception as exc:                              # noqa: BLE001
            print(json.dumps({"id": item["id"], "error": str(exc)}), file=sys.stderr, flush=True)
            continue

        path = os.path.join(out_dir, str(item["id"]) + ".mp3")
        with open(path, "wb") as fh:
            fh.write(mp3)
        print(json.dumps({"id": item["id"], "ok": True, "path": path, "sampleRate": rate,
                          "seconds": round(seconds, 2), "bytes": len(mp3)}),
              file=sys.stderr, flush=True)

    return 0


def main():
    job = json.load(sys.stdin)

    if job.get("batch"):
        return render_batch(job)

    try:
        mp3, rate, seconds = render(job)
    except Exception as exc:                                  # noqa: BLE001
        json.dump({"error": str(exc)}, sys.stderr)
        sys.stderr.flush()
        return 1

    # Metadata on stderr, audio on stdout: the caller pipes stdout straight to
    # storage without having to strip a header out of the bytes.
    json.dump({"ok": True, "sampleRate": rate, "seconds": round(seconds, 2),
               "bytes": len(mp3)}, sys.stderr)
    sys.stderr.flush()
    sys.stdout.buffer.write(mp3)
    return 0


if __name__ == "__main__":
    sys.exit(main())
