# Reshme Info: Cloudflare Deployment & Runtime Architecture Guide

Comprehensive reference for deploying the **Reshme Info Admin Portal & Backend** (`admin-pwa`) to **Cloudflare Pages** and **Cloudflare Workers**.

---

## 1. Cloudflare Environment & Account Reference

- **Account**: `Mithungowda.b7411@gmail.com`
- **Account ID**: `885e8227eb5c6d5be8f7bc48941c4ef4`
- **Project Name**: `reshme-info-backend`
- **Production URL**: `https://reshme-info-backend.pages.dev/`
- **GitHub Repository**: `Quilonix/Reshme-Info-Backend` (Private)

---

## 2. Next.js Runtime Architecture on Cloudflare

The Reshme Info backend utilizes:
- **`firebase-admin`**: Requires standard Node.js crypto and networking primitives for Firebase Cloud Messaging (FCM) push dispatch.
- **`@google-analytics/data`**: Utilizes Google APIs client libraries for live GA4 telemetry.
- **`@supabase/supabase-js`**: PostgreSQL database client with Row Level Security (RLS).

### Why Legacy `next-on-pages` Fails on Fullstack Apps:
The older `@cloudflare/next-on-pages` CLI forces all API routes to run in pure V8 Edge isolates without full Node.js standard libraries (`node:crypto`), causing failures during bundle collection.

### Recommended Approaches:
1. **Cloudflare Pages Git Integration with `nodejs_compat`** (Recommended)
2. **OpenNext for Cloudflare (`@opennextjs/cloudflare`)** (Modern CLI Standard)
3. **Vercel Edge Deployment** (Alternative 1-Click Serverless)

---

## 3. Deployment Method 1: Cloudflare Pages Git Integration (Recommended)

This provides zero-maintenance automated CI/CD directly from GitHub:

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Compute (Workers & Pages)** > **Create application** > **Pages** > **Connect to Git**.
3. Select repository: **`Quilonix/Reshme-Info-Backend`**.
4. Configure Build Settings:
   - **Framework preset**: `Next.js`
   - **Build command**: `npm run build`
   - **Build output directory**: `.next`
   - **Compatibility flag**: `nodejs_compat`
   - **Compatibility date**: `2024-09-23`
5. Verify Environment Variables in Settings (all production secrets are already synchronized).
6. Click **Save and Deploy**.

---

## 4. Deployment Method 2: OpenNext for Cloudflare (CLI)

OpenNext packages standard Next.js App Router applications with full Node.js compatibility for Cloudflare Workers:

```bash
cd /mnt/c/Projects/Reshme-Info/admin-pwa

# Build using OpenNext adapter
npx @opennextjs/cloudflare

# Deploy bundle using Wrangler
npx wrangler pages deploy .worker-next --project-name=reshme-info-backend
```

---

## 5. Deployment Method 3: Vercel (1-Click Alternative)

1. Open [Vercel](https://vercel.com).
2. Click **Add New Project** and import **`Quilonix/Reshme-Info-Backend`**.
3. Set the Environment Variables.
4. Click **Deploy**.

---

## 6. Environment Variables & Secrets Reference

All production secrets are already configured in Cloudflare Pages.

To re-sync secrets anytime you update `admin-pwa/.env.local`:
```bash
cd C:\Projects\Reshme-Info\admin-pwa
npm run cf:secrets
```

### Configured Secrets in Cloudflare Pages:
| Secret Key | Category | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | REST & Realtime API Endpoint |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | Client-safe anonymous API token |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Elevated server-side admin token |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics | GA4 Web stream measurement ID |
| `GA_PROPERTY_ID` | Google Analytics | Numeric GA4 property identifier |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Firebase | Full Service Account JSON for FCM |
| `GEMINI_API_KEY` | Google Gemini | AI OCR rate extraction key |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis | Serverless Redis REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis | Serverless Redis REST auth token |
| `CLOUDFLARE_API_TOKEN` | Cloudflare | Wrangler CLI authorization token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare | Cloudflare account identifier |

---

## 7. Custom Domain & SSL Setup

To map your custom domain (e.g. `quilonix.in` or `admin.reshmeinfo.com`):
1. In Cloudflare Pages, select **reshme-info-backend** > **Custom domains**.
2. Click **Set up a custom domain**.
3. Enter your domain and click **Continue**.
4. Cloudflare automatically configures DNS records and provisions free SSL/TLS certificates.
