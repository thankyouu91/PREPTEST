#!/usr/bin/env bash
# The AWS half of Block 0, as one command you can paste into CloudShell.
#
# Everything else about backups is already built and running: the snapshot, the
# verification, the restore, the schedule, the panel in Settings. What is missing
# is somewhere to put the copies that is not the disk the database is already on,
# and that needs permissions no automated session in this project holds — the
# deploy role can send one SSM document to one instance and nothing else, which
# is deliberate.
#
# Run it in AWS CloudShell, signed in as an account that can create an S3 bucket
# and attach a policy to a role:
#
#   bash deploy/aws-backup-setup.sh
#
# Or paste it whole. It is idempotent: run it twice and the second run changes
# nothing. It creates and grants; it never deletes.
set -uo pipefail

REGION="${AWS_REGION:-ap-southeast-1}"
INSTANCE="${INSTANCE_ID:-i-02a88c0d349f364b5}"
# Account-scoped so the name is free, and buckets are global.
ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
BUCKET="${BACKUP_BUCKET:-vpet-prep-backups-$ACCOUNT}"
PREFIX="${BACKUP_PREFIX:-db-backups}"
POLICY_NAME=VpetPrepBackupWrite

say() { printf '\n\033[1m== %s ==\033[0m\n' "$1"; }
say "Account $ACCOUNT, region $REGION, bucket $BUCKET"

# ---------------------------------------------------------------- 1. The bucket
#
# Object lock is the point, not decoration. A backup that whoever holds the
# server's credentials can also delete is not a backup — it is a copy that goes
# in the same incident. Object lock has to be enabled AT CREATION; it cannot be
# turned on later, which is why this is worth getting right the first time.
# Versioning comes with it and is what makes an overwrite recoverable too.
say "Bucket"
if aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  echo "already exists"
else
  aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" \
    --create-bucket-configuration LocationConstraint="$REGION" \
    --object-lock-enabled-for-bucket || exit 1
  echo "created with object lock enabled"
fi

aws s3api put-bucket-versioning --bucket "$BUCKET" \
  --versioning-configuration Status=Enabled && echo "versioning on"

# Governance rather than compliance mode: an administrator with
# s3:BypassGovernanceRetention can still remove something put there by mistake,
# while the server's own role cannot. Compliance mode cannot be undone by
# anybody including the account root, which is the right setting for a legal
# retention requirement and the wrong one for a first backup bucket.
aws s3api put-object-lock-configuration --bucket "$BUCKET" \
  --object-lock-configuration '{"ObjectLockEnabled":"Enabled","Rule":{"DefaultRetention":{"Mode":"GOVERNANCE","Days":30}}}' \
  && echo "30-day governance retention"

# Nothing here should ever be public, and this is belt and braces beside the
# account-level setting.
aws s3api put-public-access-block --bucket "$BUCKET" \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true \
  && echo "public access blocked"

aws s3api put-bucket-encryption --bucket "$BUCKET" \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"},"BucketKeyEnabled":true}]}' \
  && echo "encrypted at rest"

# Old versions are what versioning leaves behind, and without a rule they are
# kept for ever and paid for for ever. The live objects are pruned by
# scripts/backup.mjs; this is only about the versions underneath them.
aws s3api put-bucket-lifecycle-configuration --bucket "$BUCKET" \
  --lifecycle-configuration "{\"Rules\":[{\"ID\":\"expire-old-versions\",\"Status\":\"Enabled\",\"Filter\":{\"Prefix\":\"$PREFIX/\"},\"NoncurrentVersionExpiration\":{\"NoncurrentDays\":45}}]}" \
  && echo "old versions expire after 45 days"

# ------------------------------------------------------- 2. Let the box write
#
# Discovered rather than hardcoded: the role attached to the instance is the one
# that has to be granted, and guessing its name is how a policy ends up on the
# wrong role and the backup silently keeps failing.
say "Instance role"
PROFILE_ARN="$(aws ec2 describe-instances --instance-ids "$INSTANCE" --region "$REGION" \
  --query 'Reservations[0].Instances[0].IamInstanceProfile.Arn' --output text 2>/dev/null)"
if [ -z "$PROFILE_ARN" ] || [ "$PROFILE_ARN" = "None" ]; then
  echo "!! $INSTANCE has no instance profile attached."
  echo "!! The server cannot get AWS credentials without one. Attach a role first,"
  echo "!! then run this again."
  exit 1
fi
PROFILE_NAME="${PROFILE_ARN##*/}"
ROLE="$(aws iam get-instance-profile --instance-profile-name "$PROFILE_NAME" \
  --query 'InstanceProfile.Roles[0].RoleName' --output text)"
echo "role: $ROLE"

# Least privilege, and the two resources are not interchangeable: ListBucket is
# an operation ON THE BUCKET, the object actions are on the KEYS inside it, and
# a policy naming only one of them fails in a way that looks like a bug in the
# application. Scoped to the prefix so this role cannot read anything else that
# ends up in the bucket later.
read -r -d '' POLICY <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ListOnlyTheBackupPrefix",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::$BUCKET",
      "Condition": { "StringLike": { "s3:prefix": [ "$PREFIX/*", "$PREFIX/" ] } }
    },
    {
      "Sid": "WriteReadAndPruneBackups",
      "Effect": "Allow",
      "Action": [ "s3:PutObject", "s3:GetObject", "s3:DeleteObject" ],
      "Resource": "arn:aws:s3:::$BUCKET/$PREFIX/*"
    }
  ]
}
JSON

aws iam put-role-policy --role-name "$ROLE" \
  --policy-name "$POLICY_NAME" --policy-document "$POLICY" \
  && echo "policy $POLICY_NAME attached to $ROLE"

# Deliberately NOT granted: s3:DeleteObjectVersion and
# s3:BypassGovernanceRetention. DeleteObject on a versioned bucket only writes a
# delete marker, so the server can prune its own old backups while being unable
# to destroy any of them. That is the whole point of the bucket.

# ------------------------------------------------------------- 3. Tell the app
say "What to put on the box"
cat <<ENV

Add these three lines to /etc/vpet-prep.env on $INSTANCE, then deploy once
(or restart the app) so they are picked up:

  BACKUP_DRIVER=s3
  BACKUP_BUCKET=$BUCKET
  AWS_REGION=$REGION

Then check it from Quản trị → Cài đặt → Database backups. The banner turns
green only once the copies are leaving this machine.

And do the one thing that turns a file into a backup — put one back:

  sudo -u ubuntu bash -c 'cd /home/ubuntu/PREPTEST && node scripts/backup.mjs restore latest --into /tmp/try.sqlite --yes'

ENV
