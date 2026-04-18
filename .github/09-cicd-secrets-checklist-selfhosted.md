# Self-Hosted CI/CD Secrets Checklist

Use this checklist before enabling branch protection.

## GitHub Actions Secrets (Required)

### SSH / VPS

- [ ] `VPS_HOST`
- [ ] `VPS_USER`
- [ ] `VPS_SSH_KEY`
- [ ] `VPS_STAGING_PATH`
- [ ] `VPS_PRODUCTION_PATH`

### Registries

- [ ] `DOCKERHUB_USERNAME`
- [ ] `DOCKERHUB_TOKEN`
- [ ] `GHCR_READ_TOKEN` (for VPS pull)

### Smoke Test URLs

- [ ] `STAGING_API_BASE_URL`
- [ ] `PROD_API_BASE_URL`

## Runtime Environment Variables (Server `.env`, not GitHub)

### Core

- [ ] `NODE_ENV`
- [ ] `PORT`
- [ ] `NEXT_PUBLIC_API_URL`
- [ ] `NEXT_PUBLIC_ADMIN_URL`

### Supabase

- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`

### Messaging / Notifications

- [ ] `TWILIO_ACCOUNT_SID`
- [ ] `TWILIO_AUTH_TOKEN`
- [ ] `TWILIO_VERIFY_SERVICE_SID`
- [ ] `RESEND_API_KEY`
- [ ] `RESEND_FROM`

### Automation

- [ ] `N8N_WEBHOOK_BASE_URL`

### Payments

- [ ] `IYZICO_API_KEY`
- [ ] `IYZICO_SECRET_KEY`
- [ ] `FLUTTERWAVE_PUBLIC_KEY`
- [ ] `FLUTTERWAVE_SECRET_KEY`

## Validation Checklist

- [ ] CI workflow passes on PR
- [ ] Staging deploy workflow succeeds
- [ ] Smoke tests pass after staging deploy
- [ ] Manual production deploy succeeds
- [ ] Rollback command tested once

## Recommended Branch Protection

- Require status checks to pass before merge
- Require branch up to date before merge
- Restrict force pushes to `main`
- Optional: require signed commits
