-- Migration: Create contact_messages table for contact form submissions
-- Run this in Supabase SQL Editor or via your migration runner

CREATE TABLE IF NOT EXISTS contact_messages (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  reason TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at
ON contact_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_messages_email
ON contact_messages(email);

COMMENT ON TABLE contact_messages IS 'Messages submitted via the contact form (name, email, reason, subject, message)';
