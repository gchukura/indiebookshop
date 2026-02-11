-- Migration: Trigger to notify info@bluestonebrands.com when a row is inserted into contact_messages.
-- Uses pg_net to POST the new row to your app's webhook; the webhook sends the email via SendGrid.
--
-- Prerequisites:
-- 1. Enable the "pg_net" extension in Supabase: Database → Extensions → pg_net.
-- 2. Deploy the webhook at POST /api/webhooks/contact-notify (in this repo).
-- 3. Set your base URL (see below).
--
-- Set your deployment URL so the trigger can call the webhook:
--   INSERT INTO app_settings (key, value) VALUES ('contact_webhook_base_url', 'https://yourdomain.com')
--   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
-- (Use your real domain, e.g. https://indiebookshop.com; no trailing slash.)

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

COMMENT ON TABLE app_settings IS 'Key/value config used by triggers (e.g. contact_webhook_base_url)';

INSERT INTO app_settings (key, value)
VALUES ('contact_webhook_base_url', 'https://YOUR_DEPLOYMENT_URL')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION notify_contact_message_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_url TEXT;
  payload JSONB;
BEGIN
  base_url := (SELECT value FROM app_settings WHERE key = 'contact_webhook_base_url');
  IF base_url IS NULL OR base_url = '' OR base_url LIKE '%YOUR_DEPLOYMENT%' THEN
    RETURN NEW;
  END IF;

  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', to_jsonb(NEW),
    'old_record', NULL
  );

  PERFORM net.http_post(
    url := base_url || '/api/webhooks/contact-notify',
    body := payload,
    headers := '{"Content-Type": "application/json"}'::jsonb
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION notify_contact_message_insert() IS 'Calls app webhook on contact_messages INSERT; webhook sends email to info@bluestonebrands.com';

DROP TRIGGER IF EXISTS contact_messages_notify_trigger ON contact_messages;

CREATE TRIGGER contact_messages_notify_trigger
  AFTER INSERT ON contact_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_contact_message_insert();
