-- Migration: Create newsletter_subscriptions table for "Join Our Literary Community" signups
-- Run this in Supabase SQL Editor or via your migration runner

CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  source TEXT DEFAULT 'footer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for listing/filtering by time and for duplicate checks if needed
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_created_at
ON newsletter_subscriptions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_email
ON newsletter_subscriptions(email);

-- Optional: enable RLS and add policy if you want to restrict access (e.g. service role only)
-- For server-side inserts with service role, RLS is bypassed by default.

COMMENT ON TABLE newsletter_subscriptions IS 'Email signups from the footer "Join Our Literary Community" and other subscription forms';
