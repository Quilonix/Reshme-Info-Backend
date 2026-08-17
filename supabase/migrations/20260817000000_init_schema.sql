-- ==============================================================================
-- Reshme Info: Comprehensive Supabase PostgreSQL Schema & RLS Setup
-- ==============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Custom Types & Enums
DO $$ BEGIN
    CREATE TYPE breed_type AS ENUM ('CB', 'BV', 'CB_GOLD');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE quality_grade AS ENUM ('A', 'B', 'C');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('super_admin', 'market_admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_priority AS ENUM ('low', 'medium', 'high');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE target_audience AS ENUM ('all', 'market_specific');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE content_type AS ENUM ('image', 'pdf', 'video', 'basicInfo');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ------------------------------------------------------------------------------
-- 1. Markets Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.markets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    name_kn TEXT,
    location TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 2. Breeds Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.breeds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code breed_type NOT NULL UNIQUE,
    name TEXT NOT NULL,
    name_kn TEXT,
    description TEXT,
    description_kn TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 3. Admin Profiles Table (Linked to auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'market_admin',
    assigned_market TEXT DEFAULT 'all',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 4. Cocoon Prices Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cocoon_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    market_name TEXT NOT NULL,
    breed breed_type NOT NULL,
    quality quality_grade DEFAULT 'A',
    lot_number INT,
    total_weight NUMERIC(10, 2),
    min_price NUMERIC(10, 2) NOT NULL CHECK (min_price > 0),
    max_price NUMERIC(10, 2) NOT NULL CHECK (max_price >= min_price),
    avg_price NUMERIC(10, 2) NOT NULL CHECK (avg_price > 0),
    price_per_kg NUMERIC(10, 2),
    report_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cocoon_prices_query 
ON public.cocoon_prices(market_name, breed, report_date DESC);

CREATE INDEX IF NOT EXISTS idx_cocoon_prices_date 
ON public.cocoon_prices(report_date DESC);

-- ------------------------------------------------------------------------------
-- 5. Notifications Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority notification_priority DEFAULT 'medium',
    target_audience target_audience DEFAULT 'all',
    target_market TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_active 
ON public.notifications(is_active, created_at DESC);

-- ------------------------------------------------------------------------------
-- 6. Push Tokens Table (FCM Device Registrations)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_tokens (
    token TEXT PRIMARY KEY,
    platform TEXT NOT NULL,
    device_info JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 7. Content / Knowledge Base Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.content_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type content_type NOT NULL,
    title TEXT NOT NULL,
    title_kn TEXT,
    url TEXT,
    description TEXT,
    description_kn TEXT,
    youtube_video_id TEXT,
    youtube_thumbnail TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_items_active 
ON public.content_items(is_active, sort_order ASC, created_at DESC);

-- ------------------------------------------------------------------------------
-- 8. App Users / Onboarded Farmers Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone_number TEXT UNIQUE,
    preferred_market TEXT DEFAULT 'Ramanagara',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- Helper Functions for Row Level Security (RLS)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.admin_profiles
        WHERE id = auth.uid() AND role = 'super_admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.admin_profiles
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.can_manage_market(target_market TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.admin_profiles
        WHERE id = auth.uid() 
        AND (role = 'super_admin' OR (role = 'market_admin' AND (assigned_market = target_market OR assigned_market = 'all')))
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cocoon_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- Markets Policies
DROP POLICY IF EXISTS "Markets are viewable by everyone" ON public.markets;
CREATE POLICY "Markets are viewable by everyone" 
ON public.markets FOR SELECT USING (true);

DROP POLICY IF EXISTS "Markets can be managed by super admins" ON public.markets;
CREATE POLICY "Markets can be managed by super admins" 
ON public.markets FOR ALL 
TO authenticated 
USING (public.is_super_admin());

-- Breeds Policies
DROP POLICY IF EXISTS "Breeds are viewable by everyone" ON public.breeds;
CREATE POLICY "Breeds are viewable by everyone" 
ON public.breeds FOR SELECT USING (true);

DROP POLICY IF EXISTS "Breeds can be managed by super admins" ON public.breeds;
CREATE POLICY "Breeds can be managed by super admins" 
ON public.breeds FOR ALL 
TO authenticated 
USING (public.is_super_admin());

-- Admin Profiles Policies
DROP POLICY IF EXISTS "Admin profiles viewable by self or super admin" ON public.admin_profiles;
CREATE POLICY "Admin profiles viewable by self or super admin" 
ON public.admin_profiles FOR SELECT 
TO authenticated 
USING (id = auth.uid() OR public.is_super_admin());

DROP POLICY IF EXISTS "Admin profiles managed by super admins" ON public.admin_profiles;
CREATE POLICY "Admin profiles managed by super admins" 
ON public.admin_profiles FOR ALL 
TO authenticated 
USING (public.is_super_admin());

-- Cocoon Prices Policies
DROP POLICY IF EXISTS "Prices are viewable by everyone" ON public.cocoon_prices;
CREATE POLICY "Prices are viewable by everyone" 
ON public.cocoon_prices FOR SELECT USING (true);

DROP POLICY IF EXISTS "Prices can be inserted by permitted admins" ON public.cocoon_prices;
CREATE POLICY "Prices can be inserted by permitted admins" 
ON public.cocoon_prices FOR INSERT 
TO authenticated 
WITH CHECK (public.can_manage_market(market_name));

DROP POLICY IF EXISTS "Prices can be updated by permitted admins" ON public.cocoon_prices;
CREATE POLICY "Prices can be updated by permitted admins" 
ON public.cocoon_prices FOR UPDATE 
TO authenticated 
USING (public.can_manage_market(market_name));

DROP POLICY IF EXISTS "Prices can be deleted by super admins" ON public.cocoon_prices;
CREATE POLICY "Prices can be deleted by super admins" 
ON public.cocoon_prices FOR DELETE 
TO authenticated 
USING (public.is_super_admin());

-- Notifications Policies
DROP POLICY IF EXISTS "Active notifications are viewable by everyone" ON public.notifications;
CREATE POLICY "Active notifications are viewable by everyone" 
ON public.notifications FOR SELECT 
USING (is_active = true);

DROP POLICY IF EXISTS "Admins can view all notifications" ON public.notifications;
CREATE POLICY "Admins can view all notifications" 
ON public.notifications FOR SELECT 
TO authenticated 
USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can create notifications" ON public.notifications;
CREATE POLICY "Admins can create notifications" 
ON public.notifications FOR INSERT 
TO authenticated 
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Super admins can update/delete notifications" ON public.notifications;
CREATE POLICY "Super admins can update/delete notifications" 
ON public.notifications FOR ALL 
TO authenticated 
USING (public.is_super_admin());

-- Push Tokens Policies
DROP POLICY IF EXISTS "Anyone can register push token" ON public.push_tokens;
CREATE POLICY "Anyone can register push token" 
ON public.push_tokens FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update existing token" ON public.push_tokens;
CREATE POLICY "Anyone can update existing token" 
ON public.push_tokens FOR UPDATE 
USING (true);

DROP POLICY IF EXISTS "Admins can view push tokens" ON public.push_tokens;
CREATE POLICY "Admins can view push tokens" 
ON public.push_tokens FOR SELECT 
TO authenticated 
USING (public.is_admin());

-- App Users Policies
DROP POLICY IF EXISTS "Allow anonymous onboarding insert" ON public.app_users;
CREATE POLICY "Allow anonymous onboarding insert"
ON public.app_users FOR ALL
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated read on app_users" ON public.app_users;
CREATE POLICY "Allow authenticated read on app_users"
ON public.app_users FOR SELECT
TO authenticated
USING (true);

-- Content Items Policies
DROP POLICY IF EXISTS "Active content is viewable by everyone" ON public.content_items;
CREATE POLICY "Active content is viewable by everyone" 
ON public.content_items FOR SELECT 
USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage content items" ON public.content_items;
CREATE POLICY "Admins can manage content items" 
ON public.content_items FOR ALL 
TO authenticated 
USING (public.is_admin());
