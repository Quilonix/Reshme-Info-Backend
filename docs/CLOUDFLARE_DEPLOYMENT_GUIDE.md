# Reshme Info: Cloudflare Deployment & Architecture Guide

Comprehensive documentation for deploying the **Reshme Info Admin Portal & Backend** (`admin-pwa`) to **Cloudflare Pages**.

---

## 1. Prerequisites & Account Setup

- **Cloudflare Account**: `Mithungowda.b7411@gmail.com`
- **Account ID**: `885e8227eb5c6d5be8f7bc48941c4ef4`
- **Project Name**: `reshme-info-backend`
- **Production URL**: `https://reshme-info-backend.pages.dev/`
- **GitHub Repository**: `Quilonix/Reshme-Info-Backend` (Private)

---

## 2. Resolving Peer Dependency Conflict on Linux / WSL

If you encounter `npm error ERESOLVE unable to resolve dependency tree` when running `npx @cloudflare/next-on-pages`, use `--legacy-peer-deps`:

```bash
# In WSL or Linux terminal:
npx --legacy-peer-deps @cloudflare/next-on-pages
```

Or install dependencies with legacy peer resolution:
```bash
npm install -D @cloudflare/next-on-pages wrangler --legacy-peer-deps
```

---

## 3. Automated Deployment Methods

### Method A: Git Continuous Integration (Recommended)
This is the zero-maintenance approach where every `git push` to `main` deploys automatically:

1. Open the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Compute (Workers & Pages)** > **Create application** > **Pages** > **Connect to Git**.
3. Select **Quilonix/Reshme-Info-Backend**.
4. Set Build Settings:
   - **Framework preset**: `Next.js`
   - **Build command**: `npx --legacy-peer-deps @cloudflare/next-on-pages`
   - **Build output directory**: `.vercel/output/static`
   - **Node.js compatibility flag**: `nodejs_compat`
5. Click **Save and Deploy**.

---

## 4. Deploy from Terminal (CLI)

Run the build and deploy commands directly from `admin-pwa`:

```bash
cd /mnt/c/Projects/Reshme-Info/admin-pwa

# 1. Build Next.js for Cloudflare
npx --legacy-peer-deps @cloudflare/next-on-pages

# 2. Deploy static & edge bundle to Cloudflare Pages
npx wrangler pages deploy .vercel/output/static --project-name=reshme-info-backend
```

---

## 5. Environment Variables & Secrets Management

Secrets are already synced to Cloudflare Pages. To synchronize again anytime you change `.env.local`:

```bash
cd C:\Projects\Reshme-Info\admin-pwa
npm run cf:secrets
```
