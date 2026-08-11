# VPET Prep — container image for Cloud Run.
#
# Node 22 is a hard floor, not a preference: the data layer uses node:sqlite,
# which does not exist before 22. Alpine is safe here because the app has one
# dependency (express) and no native modules to compile against musl.
#
# Two stages so the build tools and the dev dependencies — playwright-core and
# tailwind, which together are far larger than the app — never reach the image
# that runs in production.

FROM node:22-alpine AS deps
WORKDIR /app
# Only the manifests, so this layer is cached until a dependency actually
# changes. Editing server.js does not reinstall node_modules.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

FROM node:22-alpine
ENV NODE_ENV=production
# Cloud Run injects PORT and expects the container to listen on it. 8080 is the
# documented default; server.js reads PORT and falls back to 3000 locally.
ENV PORT=8080
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY server.js ./
COPY server ./server
COPY public ./public

# The app writes three things under data/: the SQLite file, uploaded audio when
# AUDIO_STORAGE=disk, and .app-secret when APP_SECRET is unset. On Cloud Run
# that filesystem is an in-memory tmpfs — see deploy/README.md for what that
# means and which pieces have to move off it before this is a real deployment.
RUN mkdir -p data && chown -R node:node /app/data

# Never root. Cloud Run does not require it, and a container that cannot write
# outside its own data directory is one fewer thing to worry about.
USER node

EXPOSE 8080
CMD ["node", "server.js"]
