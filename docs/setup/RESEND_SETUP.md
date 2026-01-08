# Resend Email Setup Guide

This guide will help you set up Resend to send emails from your contact forms.

## Step 1: Get Your Resend API Key

1. Go to [Resend Dashboard](https://resend.com/dashboard)
2. Sign up or log in to your account
3. Go to **API Keys** in the sidebar
4. Click **"Create API Key"**
5. Give it a name (e.g., "IndieBookShop Contact Form")
6. Select the permissions (at minimum, you need "Send Emails")
7. Click **"Add"**
8. **IMPORTANT:** Copy the API key immediately - you'll only see it once!
   - It will look like: `re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - Save it securely (password manager, secure note, etc.)

## Step 2: Verify Your Domain (Optional but Recommended)

For production use, you should verify your domain:

1. In Resend Dashboard, go to **Domains**
2. Click **"Add Domain"**
3. Enter your domain (e.g., `indiebookshop.com`)
4. Follow the DNS setup instructions
5. Add the required DNS records to your domain provider
6. Wait for verification (usually takes a few minutes)

**Note:** For testing, you can use Resend's test domain: `onboarding@resend.dev`

## Step 3: Set Environment Variables

### For Vercel (Production)

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add each variable:
   - **Key:** `RESEND_API_KEY`
     - **Value:** Your API key from Step 1
     - **Environment:** Production, Preview, Development (select all)
   - **Key:** `RESEND_FROM_EMAIL`
     - **Value:** Your verified email (e.g., `noreply@indiebookshop.com` or `onboarding@resend.dev` for testing)
     - **Environment:** Production, Preview, Development (select all)
5. Click **"Save"** for each variable
6. **Important:** After adding variables, you need to redeploy:
   - Go to **Deployments** tab
   - Click the three dots (⋯) on the latest deployment
   - Click **"Redeploy"**

### For Local Development (.env file)

Create or update `.env` in your project root:

```bash
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@indiebookshop.com
```

**Replace:**
- `re_your_api_key_here` with the API key you copied in Step 1
- `noreply@indiebookshop.com` with your verified sender email

## Step 4: Test the Setup

### Test Locally

1. Make sure your `.env` file is set up correctly
2. Start your development server:
   ```bash
   npm run dev
   ```
3. Navigate to `http://localhost:3000/contact`
4. Fill out the contact form
5. Submit the form
6. Check the console - in development mode, emails are logged but not sent
7. Check `info@bluestonebrands.com` inbox for the email (in production)

### Test in Production

1. After deploying with environment variables set:
2. Go to your live site's contact page
3. Fill out and submit the form
4. Check `info@bluestonebrands.com` inbox
5. Check Vercel function logs if email doesn't arrive:
   - Go to Vercel Dashboard → Your Project → Deployments
   - Click on the latest deployment
   - Click **"Functions"** tab
   - Find `/api/contact` function
   - Click **"View Function Logs"**
   - Look for email sending status

## Step 5: Verify Email Delivery

### Check Resend Dashboard

1. In Resend Dashboard, go to **Emails**
2. You should see email delivery attempts
3. Green status = delivered successfully
4. Red status = failed (check error message)

### Common Issues

**Issue: "Invalid API Key"**
- Solution: Double-check the API key is correct and copied completely
- Make sure there are no extra spaces
- Verify the API key has "Send Emails" permission

**Issue: "Sender email not verified"**
- Solution: Make sure you verified the sender email/domain in Step 2
- The `RESEND_FROM_EMAIL` must match a verified email or domain
- For testing, use `onboarding@resend.dev`

**Issue: "Email not received"**
- Check spam/junk folder
- Check Resend Dashboard → Emails for delivery status
- Verify `info@bluestonebrands.com` is a valid, active email address
- Check Vercel function logs for errors

**Issue: "Rate limit exceeded"**
- Free tier: 3,000 emails/month
- Check your Resend usage in the dashboard
- Upgrade plan if needed

## Current Configuration

Your contact form is configured to:
- **Send emails to:** `info@bluestonebrands.com`
- **From email:** Set via `RESEND_FROM_EMAIL` environment variable
- **Reply-to:** Sender's email address (so you can reply directly)
- **Rate limiting:** 5 submissions per 15 minutes per IP (prevents spam)

## Summary Checklist

- [ ] Resend account created
- [ ] API key created and saved securely
- [ ] Domain verified (optional, recommended for production)
- [ ] Environment variables set in Vercel:
  - [ ] `RESEND_API_KEY`
  - [ ] `RESEND_FROM_EMAIL`
- [ ] Project redeployed after setting environment variables
- [ ] Test submission sent and received
- [ ] Checked Resend Dashboard → Emails for delivery status

## Security Best Practices

1. **Never commit API keys to git** - Always use environment variables
2. **Use domain verification** for production (more professional and reliable)
3. **Monitor Resend Dashboard** for suspicious activity
4. **Set up email alerts** in Resend for failed deliveries
5. **Rotate API keys periodically** if compromised

## Support Resources

- **Resend Documentation:** [https://resend.com/docs](https://resend.com/docs)
- **Resend Support:** Available in dashboard
- **API Reference:** [https://resend.com/docs/api-reference](https://resend.com/docs/api-reference)

Once you complete these steps, your contact form will be fully functional!



