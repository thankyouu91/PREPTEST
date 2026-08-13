# Prompt for setting this platform up on AWS

Paste the block below into Claude in a browser (one with web access, ideally
signed in to the AWS console). It carries the constraints that actually decide
the architecture, so the answer is about *this* application rather than a
generic "deploy Node on AWS" tutorial.

**Why it is shaped this way.** The one decision that matters is what happens to
the database, and a happy-path tutorial will skip it, hand you a working URL,
and lose every candidate's account on the next deploy. The prompt therefore
forces that decision to the front and refuses a plan that leaves it implicit.

---

## Copy from here

> I need to deploy a Node.js web application to AWS. Before proposing anything,
> read the constraints below — several of them rule out the usual answer.
>
> **The application**
>
> - Node.js **22 or newer**, required: it uses the built-in `node:sqlite`
>   module, which does not exist in Node 20.
> - Exactly **one npm dependency** (`express`). I want to keep it that way.
>   Do not propose a solution that requires adding an AWS SDK to the app unless
>   you have first told me why nothing else works.
> - Serves HTTP on the port given by `PORT`. Has a `GET /healthz` that runs a
>   real database query, and handles `SIGTERM` for graceful shutdown.
> - Enforces a strict Content-Security-Policy with a per-request nonce and
>   loads no external scripts. Anything that injects a script tag — some WAF,
>   RUM or analytics integrations do — will break every page.
> - Sets session cookies `Secure` when `NODE_ENV=production`, so it must sit
>   behind TLS termination, and must receive `X-Forwarded-Proto` correctly.
> - It is an online exam platform. Candidates sit timed tests, upload voice
>   recordings, and are marked. Losing data is not an inconvenience, it is a
>   candidate losing an exam they paid for.
>
> **The decision I actually need help with**
>
> The application stores everything — accounts, purchases, exam attempts,
> answers, marks — in **SQLite on the local filesystem**. It is currently
> deployed to Google Cloud Run pinned to exactly one instance, because two
> instances would mean two different databases and candidates would see
> whichever one answered. On a redeploy the database is lost entirely.
>
> That is acceptable for a demo and not acceptable for real candidates. So
> before you write any commands, give me a straight comparison of these, for
> a small Vietnamese exam platform with maybe a few hundred candidates a month:
>
> 1. **ECS Fargate with an EFS mount** for the SQLite file. Does EFS actually
>    work with SQLite's locking? Be honest about this — I have read conflicting
>    things and I need to know whether it is safe or merely usually fine.
> 2. **A single EC2 instance or Lightsail** with an EBS volume, systemd, and
>    nginx or Caddy in front. Boring, cheap, and the database is a file on a
>    disk that survives.
> 3. **App Runner**, if the filesystem story allows it at all.
> 4. **Migrating SQLite to RDS Postgres** and then deploying anywhere. This is
>    real application work, not a deployment task — tell me roughly how much.
>
> For each: what happens on a deploy, what happens if the instance dies, what
> happens if I accidentally scale to two, monthly cost in USD, and how I take
> a backup I could actually restore from.
>
> Recommend one and say why. If the honest answer is "do not run SQLite on
> AWS in this shape", say that.
>
> **Storage for audio and recordings**
>
> The app writes exam audio and candidate voice recordings through a small
> storage adapter with three drivers, selected by `AUDIO_STORAGE`:
> `disk`, `supabase`, `gcs`. **There is no S3 driver.**
>
> So do not assume S3. My options as things stand are `supabase` (an HTTPS API,
> works from anywhere including AWS, no new code) or `disk` on a persistent
> volume. Writing an S3 driver is possible but it is application work and it
> would add a dependency, so tell me if you think it is worth it rather than
> assuming.
>
> Current volume: about 13 MB of exam audio, plus candidate recordings that
> grow with usage.
>
> **Environment variables the app reads**
>
> `PORT`, `NODE_ENV`, `PREP_DB`, `APP_SECRET`, `AUDIO_STORAGE`, `AUDIO_DIR`,
> `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_NAME`, `FORCE_SECURE_COOKIE`,
> `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_AUDIO_BUCKET`,
> `GCS_AUDIO_BUCKET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
> `GOOGLE_REDIRECT_URI`, `REGISTER_PER_HOUR`, `ELEVENLABS_MODEL`,
> `OPENAI_ITEM_MODEL`.
>
> **`APP_SECRET` needs care.** It is the key that encrypts stored third-party
> API keys. If it changes, every stored key becomes undecryptable — not an
> error at boot, just a failure later when something tries to use one. It must
> be generated once, stored somewhere durable, and injected the same way every
> deploy. Tell me where it should live and how it reaches the container.
>
> **What I want back, in this order**
>
> 1. Your recommendation on the database question, with the reasoning.
> 2. A named list of the AWS resources that implies, and the monthly cost.
> 3. Only then, the actual steps — console clicks or CLI, your choice, but say
>    which you are giving me.
> 4. How I get a domain and HTTPS onto it.
> 5. How I take a backup, and the exact commands to restore one. I want to
>    have restored a backup successfully before any real candidate uses this.
> 6. What I should watch: which CloudWatch alarms are worth having on day one,
>    not a list of everything possible.
>
> **Do not**
>
> - Do not tell me to disable TLS verification, weaken the CSP, or run the
>   container as root.
> - Do not hand me a plan that quietly loses the database on redeploy without
>   saying so in the same breath.
> - Do not add npm dependencies to solve an infrastructure problem without
>   flagging it as an application change.
> - If a step needs a decision from me, stop and ask rather than choosing a
>   default and moving on.
>
> Region: Singapore (`ap-southeast-1`) — my users are in Vietnam.

## To here

---

## What to expect

The honest answer is probably **a single small EC2 or Lightsail instance with
an EBS volume**, which is unglamorous, costs a few dollars a month, keeps the
database on a disk that survives reboots and deploys, and matches the
one-instance constraint SQLite already imposes. Fargate plus EFS looks more
modern and puts a network filesystem under a database that was designed for a
local one.

If the browser session comes back recommending Fargate with EFS, ask it
directly whether SQLite's file locking is safe over NFS. That single question
sorts a considered answer from a fluent one.

## The alternative worth pricing

The platform is already deployed to Cloud Run and `deploy/deploy.sh` does it in
one command. If the reason for moving is cost or a preference for AWS, both are
fine reasons — but the SQLite constraint follows you across, and it is the same
problem on both clouds. Moving the database to Postgres solves it on either,
and is the work that actually unblocks scaling.
