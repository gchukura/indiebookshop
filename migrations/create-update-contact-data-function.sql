-- Create a function to safely update Google Places contact data by temporarily disabling triggers
-- This function disables triggers, updates the columns, then re-enables triggers
-- This avoids geography type errors when PostGIS is not enabled
CREATE OR REPLACE FUNCTION update_google_contact_data(
  p_bookshop_id INTEGER,
  p_formatted_phone TEXT,
  p_website_verified TEXT,
  p_opening_hours_json JSONB,
  p_google_maps_url TEXT,
  p_google_types TEXT[],
  p_formatted_address_google TEXT,
  p_business_status TEXT,
  p_contact_data_fetched_at TIMESTAMPTZ
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
    formatted_phone = p_formatted_phone,
    website_verified = p_website_verified,
    opening_hours_json = p_opening_hours_json,
    google_maps_url = p_google_maps_url,
    google_types = p_google_types,
    formatted_address_google = p_formatted_address_google,
    business_status = p_business_status,
    contact_data_fetched_at = p_contact_data_fetched_at
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

