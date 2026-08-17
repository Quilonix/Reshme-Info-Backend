# Reshme Info: Backend & Admin Command Center

Karnataka Silk Cocoon Real-Time Auction Intelligence Platform & Administrative Backend.

---

## Tech Stack
- **Framework**: Next.js 16 (App Router + Turbopack + React 19)
- **Database & Auth**: Supabase PostgreSQL + Row Level Security (RLS)
- **Telemetry & Live Analytics**: Google Analytics Data API (`@google-analytics/data`)
- **Push Notifications**: Firebase Cloud Messaging (FCM HTTP v1 API)
- **AI OCR Price Extraction**: Google Gemini API
- **Deployment**: Vercel / Node.js Engine

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
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Analytics 4 (Data API)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
GA_PROPERTY_ID=your-ga-property-id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-sa@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Firebase Cloud Messaging
FIREBASE_PROJECT_ID=reshme-info
FIREBASE_CLIENT_EMAIL=your-firebase-sa@reshme-info.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Google Gemini API
GEMINI_API_KEY=your-gemini-key
```

---

## Getting Started
```bash
# 1. Install dependencies
npm install

# 2. Start local development server
npm run dev

# 3. Build for production
npm run build
```

---

## Deployment (Vercel)
1. Push this repository to GitHub.
2. Import repository into [Vercel](https://vercel.com).
3. Set Environment Variables in Project Settings.
4. Deploy.
