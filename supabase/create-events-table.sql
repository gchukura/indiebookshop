-- Create events table for Supabase
-- This table stores events submitted for bookshops

CREATE TABLE IF NOT EXISTS public.events (
  id BIGSERIAL NOT NULL,
  bookshop_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT events_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Add foreign key constraint to bookstores table
-- This ensures events can only reference existing bookshops
ALTER TABLE public.events
ADD CONSTRAINT events_bookshop_id_fkey
FOREIGN KEY (bookshop_id)
REFERENCES public.bookstores(id)
ON DELETE CASCADE;

-- Create index on bookshop_id for faster queries
CREATE INDEX IF NOT EXISTS idx_events_bookshop_id
ON public.events(bookshop_id);

-- Create index on date for filtering events by date
CREATE INDEX IF NOT EXISTS idx_events_date
ON public.events(date);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_events_created_at
ON public.events(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to do everything (for server-side inserts)
-- This is needed for form submissions
CREATE POLICY "Service role can manage events"
ON public.events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Allow public to read events (for displaying events on the site)
CREATE POLICY "Public can read events"
ON public.events
FOR SELECT
TO public
USING (true);

-- Add comment to table
COMMENT ON TABLE public.events IS 'Events submitted for bookshops';

