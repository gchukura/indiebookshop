-- Create a function to safely update initial Google Places data by temporarily disabling triggers
-- This function disables triggers, updates the columns, then re-enables triggers
-- This avoids geography type errors when PostGIS is not enabled
CREATE OR REPLACE FUNCTION update_google_places_data(
  p_bookshop_id INTEGER,
  p_google_place_id TEXT,
  p_google_rating TEXT,
  p_google_review_count INTEGER,
  p_google_description TEXT,
  p_google_photos JSONB,
  p_google_reviews JSONB,
  p_google_price_level INTEGER,
  p_google_data_updated_at TIMESTAMPTZ
) RETURNS VOID AS $$
DECLARE
  v_trigger_name TEXT;
BEGIN
  -- Get all triggers on the bookstores table
  FOR v_trigger_name IN 
    SELECT trigger_name 
    FROM information_schema.triggers 
    WHERE event_object_table = 'bookstores'
  LOOP
    -- Disable each trigger
    EXECUTE format('ALTER TABLE public.bookstores DISABLE TRIGGER %I', v_trigger_name);
  END LOOP;
  
  -- Perform the update
  UPDATE public.bookstores
  SET 
    google_place_id = p_google_place_id,
    google_rating = p_google_rating,
    google_review_count = p_google_review_count,
    google_description = p_google_description,
    google_photos = p_google_photos,
    google_reviews = p_google_reviews,
    google_price_level = p_google_price_level,
    google_data_updated_at = p_google_data_updated_at
  WHERE id = p_bookshop_id;
  
  -- Re-enable all triggers
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
          NULL; -- Ignore errors when re-enabling
      END;
    END LOOP;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

