#!/usr/bin/env bash
#
# Deploy VPET Prep to Google Cloud Run.
#
# Idempotent: every step checks before it creates, so running this twice is
# safe and running it after a failure resumes rather than restarts.
#
#   PROJECT_ID=my-project ./deploy/deploy.sh
#
# Read deploy/README.md first. In particular: this deploys with SQLite on the
# container's in-memory filesystem, which is fine for a demo and not fine for
# real candidates. The README says exactly what that costs and what to do
# about it.

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
REGION="${REGION:-asia-southeast1}"          # Singapore: closest region to Vietnam
SERVICE="${SERVICE:-preptest}"
BUCKET="${BUCKET:-${PROJECT_ID}-exam-audio}"
SA_NAME="${SA_NAME:-preptest-run}"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

if [[ -z "$PROJECT_ID" ]]; then
  echo "Set PROJECT_ID, or run: gcloud config set project <id>" >&2
  exit 1
fi

say() { printf '\n\033[1m▸ %s\033[0m\n' "$*"; }

say "Project $PROJECT_ID · region $REGION · service $SERVICE"
gcloud config set project "$PROJECT_ID" >/dev/null

say "Enabling the APIs this needs"
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  storage.googleapis.com \
  --quiet

say "Service account"
# Its own identity rather than the default compute account, which is far more
# privileged than this service should ever be.
if ! gcloud iam service-accounts describe "$SA_EMAIL" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$SA_NAME" \
    --display-name="VPET Prep Cloud Run" --quiet
fi

say "Bucket for exam audio"
if ! gcloud storage buckets describe "gs://$BUCKET" >/dev/null 2>&1; then
  # Uniform access: no per-object ACLs, so nothing can be made public by
  # accident. Exam audio is answer material.
  gcloud storage buckets create "gs://$BUCKET" \
    --location="$REGION" --uniform-bucket-level-access --quiet
fi
gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" \
  --member="serviceAccount:$SA_EMAIL" \
  --role=roles/storage.objectAdmin --quiet >/dev/null

# --------------------------------------------------------------------------
# Secrets
#
# APP_SECRET encrypts the provider API keys at rest. Generated once and kept —
# lose it and every stored key becomes unreadable.
#
# ADMIN_PASSWORD is required: server/auth.js refuses to seed an admin account
# in production without one, deliberately, so nobody ships a known password.
# --------------------------------------------------------------------------

ensure_secret() {                       # name, generator-command
  local name="$1" gen="$2"
  if gcloud secrets describe "$name" >/dev/null 2>&1; then
    echo "  · secret $name already exists, leaving it alone"
  else
    eval "$gen" | gcloud secrets create "$name" --data-file=- --quiet
    echo "  · created secret $name"
  fi
  gcloud secrets add-iam-policy-binding "$name" \
    --member="serviceAccount:$SA_EMAIL" \
    --role=roles/secretmanager.secretAccessor --quiet >/dev/null
}

say "Secrets"
ensure_secret preptest-app-secret "openssl rand -hex 32 | tr -d '\n'"
ensure_secret preptest-admin-password "openssl rand -base64 18 | tr -d '\n/+='"

# Provider keys are optional: the platform runs without them, the features that
# need them say so. Create them empty so the deploy can reference them, then
# fill them in with: gcloud secrets versions add preptest-elevenlabs-key --data-file=-
for s in preptest-elevenlabs-key preptest-openai-key; do
  if ! gcloud secrets describe "$s" >/dev/null 2>&1; then
    printf '' | gcloud secrets create "$s" --data-file=- --quiet
    echo "  · created empty secret $s — add a version when you have the key"
  fi
  gcloud secrets add-iam-policy-binding "$s" \
    --member="serviceAccount:$SA_EMAIL" \
    --role=roles/secretmanager.secretAccessor --quiet >/dev/null
done

say "Building and deploying"
# --max-instances=1 is not a cost control, it is a correctness constraint:
# SQLite lives inside one container, so two instances would each have their own
# database and candidates would see different data depending on which one
# answered. --min-instances=1 keeps that single instance warm so its data
# survives between visits. Both go away with the move to Cloud SQL.
gcloud run deploy "$SERVICE" \
  --source . \
  --region "$REGION" \
  --service-account "$SA_EMAIL" \
  --allow-unauthenticated \
  --min-instances=1 \
  --max-instances=1 \
  --cpu=1 --memory=512Mi \
  --timeout=300 \
  --set-env-vars "NODE_ENV=production,AUDIO_STORAGE=gcs,GCS_AUDIO_BUCKET=$BUCKET" \
  --set-secrets "APP_SECRET=preptest-app-secret:latest,ADMIN_PASSWORD=preptest-admin-password:latest,ELEVENLABS_API_KEY=preptest-elevenlabs-key:latest,OPENAI_API_KEY=preptest-openai-key:latest" \
  --quiet

URL="$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')"

say "Deployed"
echo "  $URL/prep/landing/   học viên"
echo "  $URL/admin/          quản trị"
echo
echo "Admin password:"
echo "  gcloud secrets versions access latest --secret=preptest-admin-password"
echo
echo "Health check:"
curl -fsS "$URL/healthz" && echo "  ← $URL/healthz"
