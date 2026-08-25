# VPET Prep — container image.
#
# Works on any AWS runtime that takes a container: App Runner, ECS/Fargate,
# Elastic Beanstalk, or plain Docker on EC2. Nothing in here is AWS-specific;
# the platform is chosen entirely by environment variables at run time.
#
# Two-stage on purpose. Tailwind is a build-time dependency and has no business
# in the shipped image: the CSS is compiled in the first stage and only the
# resulting file is copied across, so the runtime image installs express and
# nothing else. `public/tailwind-built.css` is committed to the repo as well,
# but it is rebuilt here rather than copied, because an image whose CSS came
# from whatever happened to be committed is an image that can silently ship a
# stale stylesheet.

# ---------------------------------------------------------------- build
# Debian slim rather than Alpine: this application reads its database through
# node:sqlite, and glibc is one fewer thing to be surprised by on the day
# something goes wrong in production.
FROM node:22-slim AS build
WORKDIR /app

# The lockfile first, so a change to application code does not re-run npm ci.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Only what Tailwind scans: its config, the source stylesheet, and the markup
# and scripts its `content` globs read.
COPY tailwind.config.js ./
COPY src ./src
COPY public ./public

# Build the stylesheet, then throw the build-time packages away in the same
# stage. `npm prune` rather than a second `npm ci` in the runtime stage: one
# install instead of two, and BuildKit runs independent stages CONCURRENTLY, so
# two npm installs at once is how this build first died — npm's "Exit handler
# never called", which is what it says when it is squeezed for memory. There is
# no native code in the tree (express and nothing else), so the pruned
# node_modules copies cleanly between two identical base images.
RUN npm run build && npm prune --omit=dev && npm cache clean --force

# -------------------------------------------------------------- runtime
FROM node:22-slim
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app

# Express and nothing else — no Tailwind, no Playwright, no test harness.
# Ownership is set on the way in so the running user never needs write access
# to its own application code.
COPY --chown=node:node --from=build /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node server.js ./
COPY --chown=node:node server ./server
COPY --chown=node:node public ./public
COPY --chown=node:node --from=build /app/public/tailwind-built.css ./public/tailwind-built.css

# Amazon's RDS root certificates, so a managed database can be VERIFIED and not
# merely encrypted to. Node's default trust store does not carry them, and
# node-postgres now reads `sslmode=require` as verify-full, so without this the
# connection fails outright with SELF_SIGNED_CERT_IN_CHAIN — which is the right
# failure, and the wrong fix is to turn verification off to make it go away.
#
# Committed to the repo rather than curl'd here on purpose: a build that fetches
# its own trust anchors over the network is a build whose trust anchors depend
# on the network. Point NODE_EXTRA_CA_CERTS at this path to use it; nothing
# happens if you do not, which is what a SQLite install wants.
COPY --chown=node:node deploy/rds-ca-global.pem ./rds-ca-global.pem

# The SQLite file and uploaded audio land here. In a container this directory
# is EPHEMERAL: it is gone the moment the task is replaced, which for a
# database means every account and every sitting goes with it. Mount a volume,
# or move to a managed database and set AUDIO_STORAGE to a remote driver.
# Created here so the directory exists and belongs to the unprivileged user
# even when nothing is mounted over it.
RUN mkdir -p /app/data/uploads/audio && chown -R node:node /app/data
VOLUME ["/app/data"]

USER node
EXPOSE 3000

# The real health endpoint, which does a database round-trip — a check that
# answers from memory reports "the process is up", which the platform already
# knows. No curl in the image: Node 22 has fetch.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Exec form, so SIGTERM reaches node as PID 1 rather than a shell that ignores
# it. server/lifecycle.js is listening for it and drains before exiting 0.
CMD ["node", "server.js"]
