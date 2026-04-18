# VPS Compose Path Guide (Staging + Production)

This guide defines where your deployment files should live on a single VPS and how to wire GitHub Actions to those paths.

## Recommended Directory Layout

```text
/opt/shoplift/
  staging/
    docker-compose.yml
    .env
  production/
    docker-compose.yml
    .env
```

Use separate directories even on one server. It prevents accidental cross-environment deploys.

## Step 1 — Create directories on VPS

```bash
sudo mkdir -p /opt/shoplift/staging /opt/shoplift/production
sudo chown -R $USER:$USER /opt/shoplift
```

## Step 1.5 — Copy the compose template

Use the repository template `deploy/docker-compose.vps.yml` as the base file for both environments:

```bash
cp deploy/docker-compose.vps.yml /opt/shoplift/staging/docker-compose.yml
cp deploy/docker-compose.vps.yml /opt/shoplift/production/docker-compose.yml
```

Set `IMAGE_OWNER` in each environment's `.env` to your GitHub org/user (for GHCR image pulls).

## Step 2 — Create env files

```bash
touch /opt/shoplift/staging/.env
touch /opt/shoplift/production/.env
chmod 600 /opt/shoplift/staging/.env /opt/shoplift/production/.env
```

Populate both `.env` files with environment-specific values.

## Step 3 — Compose image strategy

Your workflow exports `IMAGE_TAG` and then runs:

```bash
docker compose pull api web admin
docker compose up -d api web admin
```

So your compose file should reference tags via `${IMAGE_TAG}`.

Example:

```yaml
services:
  api:
    image: ghcr.io/<owner>/shoplift-api:${IMAGE_TAG}
    env_file: .env
    ports:
      - "3001:3001"

  web:
    image: ghcr.io/<owner>/shoplift-web:${IMAGE_TAG}
    env_file: .env
    ports:
      - "3000:3000"

  admin:
    image: ghcr.io/<owner>/shoplift-admin:${IMAGE_TAG}
    env_file: .env
    ports:
      - "3002:3002"
```

## Step 4 — GitHub Secrets to set

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `VPS_STAGING_PATH` = `/opt/shoplift/staging`
- `VPS_PRODUCTION_PATH` = `/opt/shoplift/production`
- `GHCR_READ_TOKEN` (PAT with `read:packages`)
- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

## Step 5 — Verify before first deploy

On VPS:

```bash
cd /opt/shoplift/staging
IMAGE_TAG=staging-latest docker compose config
```

If config renders correctly, path wiring is ready.
