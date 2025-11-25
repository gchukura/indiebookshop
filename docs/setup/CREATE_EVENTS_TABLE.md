# Create Events Table in Supabase

## Overview

The events table stores events that users submit for bookshops. This table needs to be created in your Supabase database.

## Table Structure

The events table needs these columns:

- `id` - BIGSERIAL (auto-increment primary key)
- `bookshop_id` - INTEGER (references bookstores table)
- `title` - TEXT (event title)
- `description` - TEXT (event description)
- `date` - TEXT (event date, format: YYYY-MM-DD)
- `time` - TEXT (event time, format: HH:MM)
- `created_at` - TIMESTAMP (auto-generated)
- `updated_at` - TIMESTAMP (auto-generated)

## How to Create the Table

### Option 1: Using SQL Editor (Recommended)

1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the SQL from `supabase/create-events-table.sql`
3. Click "Run" to execute
4. Verify the table was created in Table Editor

### Option 2: Using Table Editor

1. Go to Supabase Dashboard → Table Editor
2. Click "New Table"
3. Name it: `events`
4. Add columns:
   - `id` - Type: `int8` (bigserial), Primary Key, Auto-increment
   - `bookshop_id` - Type: `int4` (integer), Not Null
   - `title` - Type: `text`, Not Null
   - `description` - Type: `text`, Not Null
   - `date` - Type: `text`, Not Null
   - `time` - Type: `text`, Not Null
   - `created_at` - Type: `timestamptz`, Default: `now()`
   - `updated_at` - Type: `timestamptz`, Default: `now()`
5. Add Foreign Key:
   - Column: `bookshop_id`
   - References: `bookstores(id)`
   - On Delete: `CASCADE`
6. Enable Row Level Security (RLS)
7. Create policies (see SQL file for details)

## After Creating the Table

1. Test the event submission form
2. Verify events are saved correctly
3. Check that events appear in the database

## Notes

- The `bookshop_id` must reference an existing bookstore in the `bookstores` table
- Events are inserted immediately (no `live` flag like bookstores)
- The foreign key ensures data integrity

