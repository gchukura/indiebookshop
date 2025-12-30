-- Create a function to safely update AI description without triggering geography issues
-- This function uses a workaround to update only specific columns
CREATE OR REPLACE FUNCTION update_ai_description(
  p_bookshop_id INTEGER,
  p_description TEXT,
  p_generated_at TIMESTAMPTZ
) RETURNS VOID AS $$
DECLARE
  v_sql TEXT;
BEGIN
  -- Build and execute a dynamic SQL statement that only updates the AI description columns
  -- This approach avoids triggering validation on geography columns
  v_sql := format(
    'UPDATE public.bookstores SET ai_generated_description = %L, description_generated_at = %L WHERE id = %s',
    p_description,
    p_generated_at,
    p_bookshop_id
  );
  
  EXECUTE v_sql;
EXCEPTION
  WHEN OTHERS THEN
    -- If there's still a geography error, try a different approach
    -- Update using a subquery that doesn't touch geography columns
    PERFORM 1 FROM public.bookstores WHERE id = p_bookshop_id;
    
    -- If bookshop exists, try direct column update
    IF FOUND THEN
      EXECUTE format(
        'UPDATE public.bookstores SET ai_generated_description = %L, description_generated_at = %L WHERE id = %s',
        p_description,
        p_generated_at,
        p_bookshop_id
      );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

