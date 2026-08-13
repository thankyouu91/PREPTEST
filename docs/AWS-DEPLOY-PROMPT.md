# Prompt: getting this repository onto the EC2 instance

Paste the block below into the browser session that set up your EC2 box.

---

## Read this first — Amplify is very likely the wrong tool here

I checked before writing the prompt, and there is a fact about this
application that settles it.

**Every HTML page is generated per request.** `serveHtmlWithNonce()` in
`server.js` reads the file, mints a fresh random nonce, injects it into every
`<script>` and `<style>` tag, and sets a `Content-Security-Policy` header
carrying that same nonce. Thirty-seven routes go through it.

That has a hard consequence: **these pages cannot be served as static files.**
A static host would hand out HTML whose nonce matches no CSP header, and the
browser would block every script and stylesheet on every page. The site would
render as unstyled, non-functional HTML — and it would look like a CSS bug
rather than a hosting mistake, which is the worst way for this to fail.

AWS Amplify Hosting is a static and framework-SSR host. Its SSR path is built
around adapters for Next.js and similar; it does not run an arbitrary Express
server, and its compute is Lambda-backed, which is stateless — the opposite of
what an app storing SQLite on local disk needs.

So the prompt below does two things: it asks the session to confirm or correct
that judgement against your actual setup, and then gets the repository onto
the EC2 instance you already have, which is what you need either way.

If you had a different reason for wanting Amplify — a CDN, a custom domain,
TLS, preview builds on pull requests — say which, because each has a different
answer and only one of them is Amplify-shaped.

---

## Copy from here

> We set up an EC2 instance together earlier in this conversation. I now want
> to get my application onto it and keep it deployable.
>
> **First, a question I need answered honestly before anything else.**
>
> I was going to use AWS Amplify. I have since been told it is the wrong tool
> for this application, for this reason:
>
> Every HTML page in this app is generated per request. The server reads the
> HTML file, injects a freshly generated random nonce into every `<script>`
> and `<style>` tag, and sets a `Content-Security-Policy` header containing
> that same nonce. Thirty-seven routes do this. If the HTML were served as a
> static file, the nonce in the markup would match no CSP header and the
> browser would block every script and style on the page.
>
> Tell me whether that reasoning is correct, and whether Amplify Hosting can
> serve an application like this. If it cannot, say so plainly and we move on
> to EC2. Do not try to make Amplify work if the honest answer is that it does
> not fit.
>
> **The application**
>
> - Node.js **22 or newer** — required, it uses the built-in `node:sqlite`
>   module which does not exist in Node 20.
> - One npm dependency (`express`). Installed with `npm ci --omit=dev`.
> - Listens on `PORT`. Has `GET /healthz` which runs a real database query.
>   Handles `SIGTERM` for graceful shutdown.
> - Serves its own static assets and its own API from the same process. There
>   is no separate frontend to host anywhere else.
> - Stores everything — accounts, purchases, exam attempts, answers, marks —
>   in a **SQLite file on local disk**. One process only. Two processes means
>   two different databases.
> - Also writes uploaded audio to disk by default (about 13 MB of exam audio
>   plus candidate voice recordings that grow with use).
> - There is a `Dockerfile` in the repo, multi-stage, based on `node:22-alpine`,
>   running as a non-root user. Use it or ignore it — tell me which you are
>   doing and why.
> - Source is on GitHub in a private repository.
>
> **What I want**
>
> 1. The repository onto the instance, and the app running under a process
>    manager that restarts it on reboot and on crash. I assume systemd; say if
>    you would use something else.
> 2. A reverse proxy in front terminating TLS, with a real certificate. Tell
>    me which proxy and why — I have no preference between nginx and Caddy.
>    The app must receive `X-Forwarded-Proto` correctly, because it sets the
>    `Secure` flag on session cookies based on it.
> 3. A way to deploy a new version that is one command or one push. If that
>    means a GitHub Actions workflow, write it; if it means a shell script on
>    the box, write that. I want to know which files change on my side.
> 4. Environment variables set durably, surviving reboots. `APP_SECRET` in
>    particular is the key that encrypts stored third-party API keys — if it
>    changes, every stored key becomes undecryptable, and it fails later at
>    use rather than at boot. Tell me where it should live.
> 5. **Backups of the SQLite file, and the exact restore procedure.** Use
>    `sqlite3 .backup` or `VACUUM INTO` rather than copying the file while the
>    app is running — a plain `cp` of a live SQLite database can produce a
>    corrupt copy. I want to have restored a backup successfully before any
>    real candidate uses this.
>
> **Constraints**
>
> - Do not weaken the Content-Security-Policy or add anything that injects a
>   script tag into pages. Some WAF and RUM integrations do this and it will
>   break every page.
> - Do not run the app as root.
> - Do not add npm dependencies to solve an infrastructure problem without
>   telling me it is an application change.
> - If a step needs a decision from me, stop and ask rather than picking a
>   default and carrying on.
>
> **Tell me at the end**
>
> - The monthly cost of what we have built.
> - What breaks first as candidate numbers grow, and roughly at what point.
> - Which two CloudWatch alarms are worth having on day one. Two, not twenty.

## To here

---

## What you will still be carrying

Getting onto EC2 solves the hosting question. It does not solve the database
question, and neither would Amplify:

**One instance, one SQLite file.** Deploys are safe as long as the file lives
on the EBS volume rather than inside the deployed directory, but you cannot
run two instances, and the box is a single point of failure. That is
acceptable for a launch and a real limit afterwards.

Moving to RDS Postgres is the work that lifts it, and it is application work
rather than deployment work — the data layer in `server/db.js` is written
against `node:sqlite` directly. Worth pricing before candidate numbers make it
urgent rather than after.
