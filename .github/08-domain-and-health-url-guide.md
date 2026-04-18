# Domain + Health URL Guide (for CI/CD smoke tests)

Your CI/CD workflows require two API base URLs for smoke checks:

- `STAGING_API_BASE_URL`
- `PROD_API_BASE_URL`

## Goal

Each URL should expose these endpoints:

- `GET /health` returns `200` and success payload
- `GET /auth/me` returns `401` without token (auth middleware is active)
- `GET /restaurants` returns `200` (public endpoint)

## Step 1 — DNS records

At your DNS provider create:

- `api-staging.<yourdomain>` -> VPS public IP
- `api.<yourdomain>` -> VPS public IP

Use A records with low TTL initially (e.g. 300s).

## Step 2 — Reverse proxy routing (nginx or Caddy)

Route incoming requests to internal containers:

- `api-staging.<yourdomain>` -> `localhost:3001` (staging stack port)
- `api.<yourdomain>` -> production API port (or different host if split later)

## Step 3 — TLS

Issue HTTPS certificates using Let's Encrypt.

Smoke checks should use `https://` URLs once TLS is active.

## Step 4 — Set GitHub Secrets

- `STAGING_API_BASE_URL` = `https://api-staging.<yourdomain>`
- `PROD_API_BASE_URL` = `https://api.<yourdomain>`

## Step 5 — Validate manually

```bash
curl -i https://api-staging.<yourdomain>/health
curl -i https://api-staging.<yourdomain>/auth/me
curl -i https://api-staging.<yourdomain>/restaurants
```

Expected status codes:

- `/health` => 200
- `/auth/me` => 401
- `/restaurants` => 200

## Notes for single VPS

You can still separate staging/prod by:

- different domains/subdomains, and/or
- different ports behind proxy, and
- separate compose paths and env files.

Do not share the same `.env` between staging and production.
