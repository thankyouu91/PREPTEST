# Deploying to Google Cloud

One command, once the prerequisites are in place:

```bash
PROJECT_ID=your-project ./deploy/deploy.sh
```

It enables the APIs, creates a dedicated service account, creates the audio
bucket, generates the secrets, builds the container and deploys it to Cloud Run
in `asia-southeast1` (Singapore — the closest region to Vietnam). Running it
again is safe: every step checks before it creates.

---

## Read this before you deploy

**The database does not survive.** Cloud Run gives a container an in-memory
filesystem that is discarded when the instance goes away, and the platform
stores everything in SQLite on that filesystem. So:

| Event | What happens to the data |
|---|---|
| A deploy | Gone. Fresh database, re-seeded. |
| The instance is recycled | Gone. |
| Two instances running | Two separate databases, and candidates see whichever one answered. |

The deploy script pins `--min-instances=1 --max-instances=1` to hold this
together: exactly one container, kept warm, so its data survives between
visits. That is enough for a demo, a stakeholder review, or testing the
authoring pipeline end to end. **It is not enough for real candidates**, and
nothing about the setup should be read as saying otherwise.

Two things are deliberately kept off that disk so they do survive:

- **Exam audio** goes to Cloud Storage (`AUDIO_STORAGE=gcs`). A rendered MP3
  outlives the container it was rendered in.
- **Provider API keys** come from Secret Manager as environment variables.
  `server/secrets.js` prefers the environment over the database precisely so
  this works — enter them once as secrets and they survive every deploy.
  Entering them in the admin dashboard instead would put them in the SQLite
  file, and they would be gone on the next deploy.

**What makes this real:** moving to Cloud SQL Postgres, which is the queued
architecture item in [`docs/ROADMAP.md`](../docs/ROADMAP.md). Until then, treat
this deployment as staging.

---

## Prerequisites

1. A Google Cloud project with billing enabled.
2. `gcloud` installed and authenticated:
   ```bash
   gcloud auth login
   gcloud config set project your-project
   ```
3. Your account needs to be able to create service accounts, buckets, secrets
   and Cloud Run services — Owner, or Editor plus Security Admin.

No Docker needed locally. `gcloud run deploy --source .` ships the build context
to Cloud Build, which uses the `Dockerfile` in the repository root.

---

## After the first deploy

**Get the admin password** (generated, never printed to a log):

```bash
gcloud secrets versions access latest --secret=preptest-admin-password
```

Sign in at `<url>/admin/` and change it in Quản trị → Tài khoản quản trị.

**Add the provider keys.** They start empty, so the audio and authoring features
report "no key configured" until you fill them in:

```bash
printf '%s' 'sk_your_elevenlabs_key' | \
  gcloud secrets versions add preptest-elevenlabs-key --data-file=-

printf '%s' 'sk-your_openai_key' | \
  gcloud secrets versions add preptest-openai-key --data-file=-

# Secrets are read at container start, so a new version needs a new revision:
gcloud run services update preptest --region=asia-southeast1
```

`printf` rather than `echo` on purpose — `echo` appends a newline, and a
trailing newline inside an API key produces a 401 that looks exactly like a
wrong key.

Once they are set from the environment, the admin dashboard shows them as
read-only and says which variable they came from, rather than letting somebody
type a replacement that would have no effect.

---

## A custom domain

```bash
gcloud beta run domain-mappings create \
  --service=preptest --domain=preptest.vn --region=asia-southeast1
```

Then add the DNS records it prints. Google manages the certificate. The
platform sets `Secure` on session cookies whenever `NODE_ENV=production`, so
the site must be served over HTTPS — which Cloud Run does by default.

---

## What it costs

Rough, and worth checking against the pricing calculator before committing:

| Piece | Driver | Rough monthly |
|---|---|---|
| Cloud Run, 1 instance always warm | `--min-instances=1` | $10–25 |
| Cloud Storage | a few GB of MP3 | under $1 |
| Secret Manager | 4 secrets | negligible |
| Cloud Build | a few builds a day | free tier usually covers it |

`--min-instances=1` is most of the bill. Dropping it to 0 makes the service
scale to zero and cost almost nothing — and throws the database away every time
it does. That trade only stops mattering after the move to Cloud SQL.

---

## Logs and debugging

```bash
# Live tail
gcloud beta run services logs tail preptest --region=asia-southeast1

# Last 50 lines
gcloud run services logs read preptest --region=asia-southeast1 --limit=50

# Is it up?
curl -i https://<url>/healthz
```

`/healthz` runs a query against the database rather than just returning 200, so
a container whose storage has failed reports unhealthy instead of quietly
serving errors.

| Symptom | Cause |
|---|---|
| Deploy fails with "ADMIN_PASSWORD" | The secret is missing or empty. `auth.js` refuses to seed a known admin password in production, deliberately. |
| Audio uploads fail with a token error | The service account is missing `roles/storage.objectAdmin` on the bucket, or `AUDIO_STORAGE=gcs` is set somewhere without a metadata server — that driver only works on Google Cloud. Use `AUDIO_STORAGE=disk` locally. |
| Admin login redirects back to the login screen | Cookies are `Secure` in production. Reaching the service over plain HTTP will not hold a session. |
| Everything reset after a deploy | Expected. See the top of this file. |

---

## An alternative worth knowing about

If the point is to run this for real *now* and the Postgres migration is not
imminent, a small Compute Engine VM is the more honest fit: SQLite on a
persistent disk behaves exactly as it does in development, an `e2-micro`
costs a few dollars a month, and nothing is lost on restart. The trade is that
you own the VM — OS updates, TLS certificates, restarts.

Cloud Run is the better destination, and the app is built for it. It just needs
the database to move off the container first.
