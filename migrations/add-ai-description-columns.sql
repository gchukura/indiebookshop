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
COMMENT ON COLUMN public.bookstores.ai_generated_description IS 'AI-generated 300-word description using only verified data';
COMMENT ON COLUMN public.bookstores.description_generated_at IS 'Timestamp of when the AI description was generated';
COMMENT ON COLUMN public.bookstores.description_validated IS 'Whether the description has been manually validated';

-- Create index on description_generated_at for finding bookshops without descriptions
CREATE INDEX IF NOT EXISTS idx_bookstores_description_generated_at
ON public.bookstores(description_generated_at)
WHERE description_generated_at IS NOT NULL;

-- Create a function to safely update AI description without triggering geography issues
-- This function updates only the AI description columns, avoiding any triggers on geography columns
CREATE OR REPLACE FUNCTION update_ai_description(
  p_bookshop_id INTEGER,
  p_description TEXT,
  p_generated_at TIMESTAMPTZ
) RETURNS VOID AS $$
BEGIN
  UPDATE public.bookstores
  SET 
    ai_generated_description = p_description,
    description_generated_at = p_generated_at
  WHERE id = p_bookshop_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

