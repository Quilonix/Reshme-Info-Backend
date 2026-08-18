-- ==============================================================================
-- Reshme Info: Emergency Security Patch — Row Level Security (RLS) Lockdown
-- Supabase Project: slabfaumgcktgeuzvkfj
-- ==============================================================================

-- 1. Enable and Force Row Level Security (RLS) across all tables
ALTER TABLE IF EXISTS public.markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.markets FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.breeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.breeds FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.cocoon_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cocoon_prices FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.push_tokens FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.content_items FORCE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.app_users FORCE ROW LEVEL SECURITY;

-- 2. Revoke default write privileges from anon role
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.markets FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.breeds FROM anon;
REVOKE ALL ON public.admin_profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.cocoon_prices FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.notifications FROM anon;
REVOKE DELETE, TRUNCATE ON public.content_items FROM anon;
REVOKE DELETE, TRUNCATE ON public.push_tokens FROM anon;
REVOKE DELETE, TRUNCATE ON public.app_users FROM anon;

-- Grant selective read privileges
GRANT SELECT ON public.markets TO anon, authenticated;
GRANT SELECT ON public.breeds TO anon, authenticated;
GRANT SELECT ON public.cocoon_prices TO anon, authenticated;
GRANT SELECT ON public.content_items TO anon, authenticated;
GRANT SELECT ON public.notifications TO anon, authenticated;

-- Allow anon mobile app users to register phone/token
GRANT INSERT, UPDATE ON public.push_tokens TO anon, authenticated;
GRANT INSERT, UPDATE ON public.app_users TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- 3. Hardened Security Definer Helper Functions
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

-- ------------------------------------------------------------------------------
-- 4. Clean & Re-apply Strict RLS Policies
-- ------------------------------------------------------------------------------

-- MARKETS
DROP POLICY IF EXISTS "Markets are viewable by everyone" ON public.markets;
DROP POLICY IF EXISTS "Markets can be managed by super admins" ON public.markets;
DROP POLICY IF EXISTS "Public read markets" ON public.markets;
DROP POLICY IF EXISTS "Admin write markets" ON public.markets;

CREATE POLICY "Public read markets" 
ON public.markets FOR SELECT 
USING (true);

CREATE POLICY "Super admin manage markets" 
ON public.markets FOR ALL 
TO authenticated 
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- BREEDS
DROP POLICY IF EXISTS "Breeds are viewable by everyone" ON public.breeds;
DROP POLICY IF EXISTS "Breeds can be managed by super admins" ON public.breeds;
DROP POLICY IF EXISTS "Public read breeds" ON public.breeds;

CREATE POLICY "Public read breeds" 
ON public.breeds FOR SELECT 
USING (true);

CREATE POLICY "Super admin manage breeds" 
ON public.breeds FOR ALL 
TO authenticated 
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- ADMIN PROFILES (Protected from public access)
DROP POLICY IF EXISTS "Admin profiles viewable by self or super admin" ON public.admin_profiles;
DROP POLICY IF EXISTS "Admin profiles managed by super admins" ON public.admin_profiles;

CREATE POLICY "Admin profiles viewable by authenticated self or super admin" 
ON public.admin_profiles FOR SELECT 
TO authenticated 
USING (id = auth.uid() OR public.is_super_admin());

CREATE POLICY "Admin profiles managed by super admins only" 
ON public.admin_profiles FOR ALL 
TO authenticated 
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- COCOON PRICES
DROP POLICY IF EXISTS "Prices are viewable by everyone" ON public.cocoon_prices;
DROP POLICY IF EXISTS "Prices can be inserted by permitted admins" ON public.cocoon_prices;
DROP POLICY IF EXISTS "Prices can be updated by permitted admins" ON public.cocoon_prices;
DROP POLICY IF EXISTS "Prices can be deleted by super admins" ON public.cocoon_prices;

CREATE POLICY "Public read cocoon prices" 
ON public.cocoon_prices FOR SELECT 
USING (true);

CREATE POLICY "Admins insert cocoon prices" 
ON public.cocoon_prices FOR INSERT 
TO authenticated 
WITH CHECK (public.can_manage_market(market_name));

CREATE POLICY "Admins update cocoon prices" 
ON public.cocoon_prices FOR UPDATE 
TO authenticated 
USING (public.can_manage_market(market_name))
WITH CHECK (public.can_manage_market(market_name));

CREATE POLICY "Super admins delete cocoon prices" 
ON public.cocoon_prices FOR DELETE 
TO authenticated 
USING (public.is_super_admin());

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Active notifications are viewable by everyone" ON public.notifications;
DROP POLICY IF EXISTS "Admins can view all notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Super admins can update/delete notifications" ON public.notifications;

CREATE POLICY "Public read active notifications" 
ON public.notifications FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins read all notifications" 
ON public.notifications FOR SELECT 
TO authenticated 
USING (public.is_admin());

CREATE POLICY "Admins insert notifications" 
ON public.notifications FOR INSERT 
TO authenticated 
WITH CHECK (public.is_admin());

CREATE POLICY "Super admins manage notifications" 
ON public.notifications FOR ALL 
TO authenticated 
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- PUSH TOKENS
DROP POLICY IF EXISTS "Anyone can register push token" ON public.push_tokens;
DROP POLICY IF EXISTS "Anyone can update existing token" ON public.push_tokens;
DROP POLICY IF EXISTS "Admins can view push tokens" ON public.push_tokens;

CREATE POLICY "Public register push token" 
ON public.push_tokens FOR INSERT 
WITH CHECK (token IS NOT NULL);

CREATE POLICY "Public update push token" 
ON public.push_tokens FOR UPDATE 
USING (true)
WITH CHECK (token IS NOT NULL);

CREATE POLICY "Admins read push tokens" 
ON public.push_tokens FOR SELECT 
TO authenticated 
USING (public.is_admin());

CREATE POLICY "Super admins delete push tokens" 
ON public.push_tokens FOR DELETE 
TO authenticated 
USING (public.is_super_admin());

-- CONTENT ITEMS (KNOWLEDGE CMS)
DROP POLICY IF EXISTS "Active content is viewable by everyone" ON public.content_items;
DROP POLICY IF EXISTS "Admins can manage content items" ON public.content_items;

CREATE POLICY "Public read active content" 
ON public.content_items FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins manage content items" 
ON public.content_items FOR ALL 
TO authenticated 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- APP USERS
DROP POLICY IF EXISTS "Users can insert profile" ON public.app_users;
DROP POLICY IF EXISTS "Users can update own profile by phone" ON public.app_users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.app_users;
DROP POLICY IF EXISTS "Super admins can manage users" ON public.app_users;

CREATE POLICY "Public upsert farmer profile" 
ON public.app_users FOR INSERT 
WITH CHECK (phone_number IS NOT NULL AND length(phone_number) >= 10);

CREATE POLICY "Public update farmer profile" 
ON public.app_users FOR UPDATE 
USING (phone_number IS NOT NULL)
WITH CHECK (phone_number IS NOT NULL);

CREATE POLICY "Admins view all farmer users" 
ON public.app_users FOR SELECT 
TO authenticated 
USING (public.is_admin());

CREATE POLICY "Super admins manage farmer users" 
ON public.app_users FOR ALL 
TO authenticated 
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());
