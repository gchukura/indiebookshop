# Form Submissions Setup

This document explains how form submissions work and what environment variables need to be configured.

## Overview

The application has two types of form submissions:
1. **Bookstore Submissions** - Users can submit new bookstores or suggest changes to existing ones
2. **Event Submissions** - Users can submit events for bookstores

Both submissions are:
- Saved to Supabase database
- Sent via email notification to the admin using SendGrid

## Environment Variables Required

### For Vercel (Production)

Add these environment variables in your Vercel project settings:

```bash
# SendGrid Configuration
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=noreply@indiebookshop.com  # Must be a verified sender in SendGrid
ADMIN_EMAIL=your_admin_email@example.com  # Where submission notifications are sent

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here  # Server-side key (bypasses RLS)
```

### For Local Development

Add these to your `.env` file in the project root:

```bash
# SendGrid Configuration
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=noreply@indiebookshop.com
ADMIN_EMAIL=your_admin_email@example.com

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Important Notes:**
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are for **client-side** (browser)
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are for **server-side** (form submissions)
- The service role key bypasses Row Level Security (RLS) and allows server-side inserts
- Keep the service role key secret - never commit it to git

### How to Get the Service Role Key

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Find **Project API keys**
5. Copy the **`service_role`** key (NOT the `anon` key)
   - ⚠️ **Important**: This key bypasses Row Level Security (RLS)
   - Keep it secret - never commit it to git

## Supabase Tables

The submissions are saved to these Supabase tables:

### `bookstores` table
- New bookstore submissions are inserted with `live: false` (pending review)
- Standard fields: `name`, `street`, `city`, `state`, `zip`, `description`, `website`, `phone`, `hours_json`, `feature_ids`, etc.
- Note: The actual schema uses `imageUrl` (camelCase) and `hours_json` (jsonb) columns
- Note: `submitter_email`, `submitter_name`, `submission_type` columns do NOT exist in the current schema (submissions are tracked via `live: false` status)

### `events` table
- Event submissions are inserted directly (no review process)
- Fields: `bookshop_id`, `title`, `description`, `date`, `time`
- See `supabase/create-events-table.sql` for the complete table schema

## SendGrid Setup

1. **Create a SendGrid account** (if you don't have one)
2. **Verify your sender email** in SendGrid:
   - Go to Settings > Sender Authentication
   - Verify the email address you'll use for `SENDGRID_FROM_EMAIL`
3. **Create an API Key**:
   - Go to Settings > API Keys
   - Create a new API key with "Full Access" or "Mail Send" permissions
   - Copy the key and use it for `SENDGRID_API_KEY`

## How It Works

### Bookstore Submissions

1. User fills out the submission form (`/submit` page)
2. Form data is validated
3. Submission is saved to Supabase `bookstores` table with `live: false`
4. Email notification is sent to `ADMIN_EMAIL` via SendGrid
5. Admin reviews and can manually set `live: true` in Supabase to publish

### Event Submissions

1. User fills out the event form
2. Form data is validated
3. Event is saved to Supabase `events` table
4. Event is immediately visible (no review process)

## Troubleshooting

### Submissions not saving to Supabase
- Check that `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set correctly
- Verify the service role key has permissions to insert into `bookstores` and `events` tables
- Check server logs for Supabase errors

### Emails not sending
- Verify `SENDGRID_API_KEY` is set correctly
- Ensure `SENDGRID_FROM_EMAIL` is a verified sender in SendGrid
- Check SendGrid dashboard for email delivery status
- Verify `ADMIN_EMAIL` is a valid email address

### Forms showing errors
- Check browser console for API errors
- Verify all required environment variables are set
- Check server logs for detailed error messages

## Testing

To test form submissions locally:

1. Ensure all environment variables are set in `.env`
2. Start the development server: `npm run dev`
3. Navigate to `/submit` page
4. Fill out and submit the form
5. Check:
   - Supabase dashboard to see if submission was saved
   - Email inbox for notification email
   - Server console for any errors

