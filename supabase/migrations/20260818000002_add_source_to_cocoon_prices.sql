-- ==============================================================================
-- Add 'source' column to cocoon_prices to track origin (wa_automation, manual, ai_extractor)
-- ==============================================================================

ALTER TABLE IF EXISTS public.cocoon_prices 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Comment on column
COMMENT ON COLUMN public.cocoon_prices.source IS 'Origin of rate entry: manual, wa_automation, or ai_extractor';
