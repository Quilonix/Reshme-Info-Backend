# Reshme Info: Backend & Admin Command Center

Karnataka Silk Cocoon Real-Time Auction Intelligence Platform & Administrative Backend.

---

## Tech Stack
- **Framework**: Next.js 16 (App Router + Turbopack + React 19)
- **Database & Auth**: Supabase PostgreSQL + Row Level Security (RLS)
- **Telemetry & Live Analytics**: Google Analytics Data API (`@google-analytics/data`)
- **Push Notifications**: Firebase Cloud Messaging (FCM HTTP v1 API)
- **AI OCR Price Extraction**: Google Gemini API
- **Deployment Platform**: Vercel Global Edge

---

## Directory Structure
```
admin-pwa/
├── app/
│   ├── page.tsx               # Public Consumer Landing Page (Live Rates + APK CTA)
│   ├── admin/page.tsx         # Protected Admin Command Center
│   ├── prices/page.tsx        # Daily Market Auction Rate Entry & 7-Day Cleaner
│   ├── ai-extractor/page.tsx  # AI PDF/WhatsApp Bulletin OCR Extraction
│   ├── notifications/page.tsx # FCM Push Notification Broadcast Studio
│   ├── cms/page.tsx           # Bilingual Sericulture Knowledge Hub
│   ├── users/page.tsx         # Onboarded Farmers + Push Devices + Admin Team Watch
│   ├── analytics/page.tsx     # GA4 Real-time Active Farmers & District Telemetry
│   ├── markets/page.tsx       # APMC Silk Markets & Breeds Management
│   ├── settings/page.tsx      # Android APK Remote Version & Force Update Control
│   ├── api/                   # Server API Routes (Admins, Analytics, OCR, FCM)
│   └── globals.css            # Responsive Design System
├── components/
│   └── Sidebar.tsx            # Desktop Sidebar & Mobile Bottom Navigation Bar
├── lib/
│   ├── supabase.ts            # Supabase SSR / Browser Client
│   ├── AuthContext.tsx        # Authentication & Role Provider
│   └── analytics.ts           # Client Event & Page View Tracker
└── supabase/
    └── migrations/            # PostgreSQL Database Schemas & RLS Setup
```

---

## Environment Setup
Create `.env.local` in `admin-pwa/`:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Analytics 4 (Data API)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
GA_PROPERTY_ID=your-ga-property-id

# Firebase Cloud Messaging
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"reshme-info",...}

# Google Gemini AI OCR
GEMINI_API_KEY=your-gemini-key

# Upstash Redis Hybrid Cache (Optional)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

---

## Local Development
```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Build for production
npm run build
```

---

## Deployment (Vercel)

1. Go to [Vercel Dashboard](https://vercel.com).
2. Click **Add New Project** and select **`Quilonix/Reshme-Info-Backend`**.
3. In **Environment Variables**, paste the keys from your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_GA_MEASUREMENT_ID`
   - `GA_PROPERTY_ID`
   - `FIREBASE_SERVICE_ACCOUNT_KEY`
   - `GEMINI_API_KEY`
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. Click **Deploy**.
