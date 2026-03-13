# Shoplift Infrastructure & Manual Setup Guide

This document captures the manual configurations required across Google Cloud Platform (GCP), Firebase, and GitHub that cannot be automated in this iteration.

---

## 1. Workload Identity Federation (WIF) setup

**Critical required step for GitHub Actions staging deployment.**

This setup connects GitHub Actions to GCP without storing long-lived service account keys.
Perform này in the GCP console for both `shoplift-staging` and `shoplift-prod`.

1. **Create Pool:**
   - Go to GCP Console -> **IAM** -> **Workload Identity Federation** -> **Create Pool**
   - Pool name: `github-actions`
2. **Configure Provider:**
   - Provider: **OIDC**
   - Provider name: `github`
   - Issuer URL: `https://token.actions.githubusercontent.com`
   - Attribute mapping:
     - `google.subject` = `assertion.sub`
     - `attribute.repository` = `assertion.repository`
   - Attribute condition: `assertion.repository == "Shoplift-TR/monorepo"`
3. **Create Service Account:**
   - Name: `github-actions-deploy`
   - Roles: **Cloud Run Admin**, **Artifact Registry Writer**, **Firebase Admin**, **Secret Manager Secret Accessor**
4. **Grant Impersonation:**
   - Grant the Workload Identity Pool permission to impersonate the service account.
5. **Add GitHub Secrets:**
   - `WIF_PROVIDER`: Full provider resource name from the pool.
   - `WIF_SERVICE_ACCOUNT`: `github-actions-deploy@shoplift-staging.iam.gserviceaccount.com`
   - _(Repeat with `-prod` equivalent for production)._

---

## 2. Firebase Auth Configure Sign-In Methods

Enable these providers in [console.firebase.google.com](https://console.firebase.google.com) -> Authentication -> Sign-in method for `dev`, `staging`, and `prod`:

1. **Email/Password**: Toggle ON.
2. **Phone**: Toggle ON (Android SHA-1 fingerprint can be added later).
3. **Google**: Toggle ON, set project support email.
4. **Apple**: Requires Apple Dev account. Detailed config [here](https://firebase.google.com/docs/auth/ios/apple).

---

## 3. Cloud Secret Manager Configuration

Secrets must be populated per environment.
Go to GCP Console -> Secret Manager -> Create Secret.

1. **Naming Convention:** `[variable-name]-[env]` (e.g. `supabase-url-dev`, `supabase-url-staging`).
2. **Placeholder Values:** Use "placeholder" for unused third-party services initially.
3. **IAM Permissions:**
   - Give your Google Account the **Secret Manager Secret Accessor** role on `shoplift-dev` so `direnv` and `.envrc` load them correctly locally.
   - Staging/Production IAM applies _only_ to the `github-actions-deploy` service account, configured in Step 1.

---

## 4. GitHub Branch Protection on `main`

Protect the operational state of `main`.

1. Go to GitHub repo settings -> **Branches** -> **Add branch protection rule**.
2. **Pattern**: `main`
3. Enable:
   - ✅ Require a pull request before merging (Require 1 approval)
   - ✅ Require status checks to pass before merging (Add `ci` job)
   - ✅ Require branches to be up to date before merging
   - ✅ Do not allow bypassing the above settings
   - ✅ Restrict who can push to matching branches (Add admins/yourself)

---

## 5. Cloud Armor (WAF & Admin IP Allowlist)

Go to GCP Console -> **Network Security** -> **Cloud Armor** -> **Create Policy**.
Attach policies to your Cloud Run load balancer backend.

**Policy 1: `shoplift-waf`** (Global Traffic)

- Rule 1: Enable `sqli-v33-stable` (SQL Injection protection)
- Rule 2: Enable `xss-v33-stable` (XSS protection)
- Rule 3: Rate limit — 1,000 requests per IP per minute (Action: throttle)

**Policy 2: `super-admin-allowlist`** (Path: `/admin/super/*`)

- Rule 1: Allow Source IP range (Your static IP address)
- Rule 2: Deny all (Priority 1000 - action 403)
