-- Migration: Add AI-generated description columns to bookstores table
-- This migration adds columns to store AI-generated descriptions and metadata

-- Add column for AI-generated description
ALTER TABLE public.bookstores 
ADD COLUMN IF NOT EXISTS ai_generated_description TEXT;

-- Add timestamp for when it was generated
ALTER TABLE public.bookstores 
ADD COLUMN IF NOT EXISTS description_generated_at TIMESTAMPTZ;

-- Add validation status
ALTER TABLE public.bookstores 
ADD COLUMN IF NOT EXISTS description_validated BOOLEAN DEFAULT false;

-- Add comments to columns for documentation
COMMENT ON COLUMN public.bookstores.ai_generated_description IS 'AI-generated 200-word description using only verified Google Places data';
COMMENT ON COLUMN public.bookstores.description_generated_at IS 'Timestamp of when the AI description was generated';
COMMENT ON COLUMN public.bookstores.description_validated IS 'Whether the description passed validation (no critical errors)';

-- Create index on description_generated_at for finding bookshops without descriptions
CREATE INDEX IF NOT EXISTS idx_bookstores_description_generated_at
ON public.bookstores(description_generated_at)
WHERE description_generated_at IS NOT NULL;

-- Create a function to safely update AI description without triggering geography issues
-- This function updates only the AI description columns, avoiding any triggers on geography columns
CREATE OR REPLACE FUNCTION update_ai_description(
  p_bookshop_id INTEGER,
  p_description TEXT,
  p_generated_at TIMESTAMPTZ,
  p_validated BOOLEAN DEFAULT false
) RETURNS VOID AS $$
DECLARE
  v_trigger_name TEXT;
BEGIN
  -- Temporarily disable triggers to avoid geography type errors
  FOR v_trigger_name IN
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE event_object_table = 'bookstores'
  LOOP
    EXECUTE format('ALTER TABLE public.bookstores DISABLE TRIGGER %I', v_trigger_name);
  END LOOP;

  UPDATE public.bookstores
  SET 
    ai_generated_description = p_description,
    description_generated_at = p_generated_at,
    description_validated = p_validated
  WHERE id = p_bookshop_id;

  -- Re-enable triggers
  FOR v_trigger_name IN
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE event_object_table = 'bookstores'
  LOOP
    EXECUTE format('ALTER TABLE public.bookstores ENABLE TRIGGER %I', v_trigger_name);
  END LOOP;

EXCEPTION
  WHEN OTHERS THEN
    -- Make sure triggers are re-enabled even if update fails
    FOR v_trigger_name IN
      SELECT trigger_name
      FROM information_schema.triggers
      WHERE event_object_table = 'bookstores'
    LOOP
      BEGIN
        EXECUTE format('ALTER TABLE public.bookstores ENABLE TRIGGER %I', v_trigger_name);
      EXCEPTION
        WHEN OTHERS THEN
          NULL;
      END;
    END LOOP;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

