# Fix SendGrid Email Service

If you're seeing "notification email failed" messages, follow these steps to diagnose and fix the issue.

## Step 1: Check Vercel Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Your Project → **Settings** → **Environment Variables**
3. Verify these variables are set for **Production**:
   - `SENDGRID_API_KEY` - Your SendGrid API key
   - `SENDGRID_FROM_EMAIL` - Verified sender email (e.g., `noreply@indiebookshop.com`)
   - `ADMIN_EMAIL` - Where notifications should be sent

## Step 2: Verify SendGrid Configuration

### Get Your SendGrid API Key

1. Go to [SendGrid Dashboard](https://app.sendgrid.com/)
2. **Settings** → **API Keys**
3. Create a new API key or use an existing one
4. Make sure it has **Mail Send** permissions
5. Copy the API key (you'll only see it once!)

### Verify Sender Email

1. In SendGrid Dashboard, go to **Settings** → **Sender Authentication**
2. Verify your sender email address
3. The email must be verified before you can send from it
4. Use this verified email as `SENDGRID_FROM_EMAIL`

## Step 3: Check Vercel Function Logs

After submitting a form, check the logs:

1. Vercel Dashboard → **Deployments** → Latest
2. Click **Functions** tab
3. Find `/api/bookstores/submit` function
4. Click **View Function Logs**
5. Look for:
   - `Serverless: ❌ Cannot send email: SENDGRID_API_KEY is not set`
   - `Serverless: ❌ SendGrid email error: [error message]`
   - `Serverless: SendGrid error details: [details]`

## Step 4: Common Issues

### Issue 1: Missing Environment Variables

**Error:** `SENDGRID_API_KEY is not set`

**Fix:**
- Add `SENDGRID_API_KEY` to Vercel environment variables
- Make sure it's set for **Production** environment
- Redeploy after adding variables

### Issue 2: Invalid API Key

**Error:** `401 Unauthorized` or `403 Forbidden`

**Fix:**
- Verify the API key is correct
- Make sure the API key has **Mail Send** permissions
- Create a new API key if needed

### Issue 3: Unverified Sender

**Error:** `The from address does not match a verified Sender Identity`

**Fix:**
- Go to SendGrid → **Settings** → **Sender Authentication**
- Verify the sender email address
- Use the verified email as `SENDGRID_FROM_EMAIL`

### Issue 4: Invalid Email Format

**Error:** `Invalid email address`

**Fix:**
- Check `ADMIN_EMAIL` is a valid email address
- Check `SENDGRID_FROM_EMAIL` is a valid email address
- Make sure there are no extra spaces or characters

## Step 5: Test After Fixing

1. Update environment variables in Vercel
2. **Redeploy** (go to Deployments → Latest → Redeploy)
3. Submit a test form
4. Check logs to see if email was sent successfully
5. Check your admin email inbox

## Step 6: Verify Email Was Sent

Look for these log messages:
- ✅ `Serverless: ✅ Email sent successfully to [email]`
- ✅ `Serverless: SendGrid response status: 202`

If you see these, the email was sent successfully!

## Still Not Working?

If emails still aren't sending after following these steps:

1. Check SendGrid Activity Feed:
   - Go to SendGrid Dashboard → **Activity**
   - Look for recent email attempts
   - Check for error messages

2. Check SendGrid Account Status:
   - Make sure your SendGrid account is active
   - Check if you've hit any rate limits
   - Verify your account isn't suspended

3. Review Detailed Logs:
   - The improved logging will show exact error messages
   - Share the error details for further debugging

