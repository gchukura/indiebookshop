# Build Notes

## Static generation and database timeouts

During `next build`, Next.js pre-renders all bookshop pages (SSG). Each page can trigger Supabase queries. If you see:

```
Error fetching bookstores: { code: '57014', message: 'canceling statement due to statement timeout' }
Failed to build /bookshop/[slug]/page: ... because it took more than 60 seconds
```

then Postgres is killing long-running queries.

**Fix:** Increase the statement timeout in Supabase for the build:

1. In **Supabase Dashboard** → **Project Settings** → **Database**, find **Statement timeout** (or run in SQL Editor):
   ```sql
   ALTER DATABASE postgres SET statement_timeout = '300s';
   ```
2. Or set it per-role/session if you prefer not to change the default.

Builds usually complete after retries; increasing the timeout reduces failed attempts and speeds up the build.
