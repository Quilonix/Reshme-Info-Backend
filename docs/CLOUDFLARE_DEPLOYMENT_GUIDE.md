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

## 2. Resolving Peer Dependency (ERESOLVE) in WSL / Linux

When running `npx next-on-pages`, it invokes `vercel build` which triggers an internal `npm install` sub-process. Because Next.js 16 is newer than the default peer range expected by older tooling, npm may block with an `ERESOLVE` error.

### The Fix:
1. Ensure `.npmrc` exists in `admin-pwa/` with:
   ```ini
   legacy-peer-deps=true
   ```
2. Configure npm in your WSL/Linux environment:
   ```bash
   npm config set legacy-peer-deps true
   ```
3. Run the build command directly:
   ```bash
   npx next-on-pages
   ```

---

## 3. Deployment Methods

### Method A: Git Continuous Integration (Recommended)
Every `git push` to `main` on `Quilonix/Reshme-Info-Backend` triggers a Cloudflare Pages deployment:

1. Open the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Compute (Workers & Pages)** > **Create application** > **Pages** > **Connect to Git**.
3. Select repository: **Quilonix/Reshme-Info-Backend**.
4. Set Build Configuration:
   - **Framework preset**: `Next.js`
   - **Build command**: `npx next-on-pages`
   - **Build output directory**: `.vercel/output/static`
   - **Node.js compatibility flag**: `nodejs_compat`
5. Click **Save and Deploy**.

---

## 4. Deploy via Terminal (CLI)

Run the build and deploy commands directly from `admin-pwa`:

```bash
cd /mnt/c/Projects/Reshme-Info/admin-pwa

# 1. Build Next.js for Cloudflare Pages
npx next-on-pages

# 2. Deploy bundle to Cloudflare Pages
npx wrangler pages deploy .vercel/output/static --project-name=reshme-info-backend
```

---

## 5. Environment Variables & Secrets Management

All production secrets have been synchronized to Cloudflare Pages via CLI.

To re-sync anytime you modify `admin-pwa/.env.local`:
```bash
cd C:\Projects\Reshme-Info\admin-pwa
npm run cf:secrets
```
