# SendGrid Setup Guide for Contact Form

This guide will walk you through setting up SendGrid to send emails from the contact form to `info@bluestonebrands.com`.

## Step 1: Create a SendGrid Account

1. Go to [https://sendgrid.com/](https://sendgrid.com/)
2. Click **"Start for Free"** or **"Sign Up"**
3. Fill out the signup form
4. Verify your email address
5. Complete the account setup

**Note:** SendGrid offers a free tier with 100 emails per day, which should be sufficient for contact form submissions.

---

## Step 2: Verify Your Sender Email

You need to verify the email address that will be used as the "from" address in emails.

### Option A: Single Sender Verification (Recommended for Quick Setup)

1. Log in to your SendGrid dashboard
2. Go to **Settings** → **Sender Authentication** → **Single Sender Verification**
3. Click **"Create a Sender"**
4. Fill out the form:
   - **From Email Address:** Enter the email you want to send from (e.g., `noreply@indiebookshop.com` or `contact@indiebookshop.com`)
   - **From Name:** Enter a display name (e.g., "IndieBookShop.com")
   - **Reply To:** Enter `info@bluestonebrands.com` (this is where replies will go)
   - **Company Address:** Enter your business address
   - **City, State, Zip:** Enter your location
   - **Country:** Select your country
5. Click **"Create"**
6. Check the email inbox for the verification email
7. Click the verification link in the email
8. **Important:** Copy the verified email address - you'll need it for `SENDGRID_FROM_EMAIL`

### Option B: Domain Authentication (Recommended for Production)

If you own a domain (e.g., `indiebookshop.com`), you can authenticate the entire domain:

1. Go to **Settings** → **Sender Authentication** → **Domain Authentication**
2. Click **"Authenticate Your Domain"**
3. Follow the DNS setup instructions
4. This allows you to send from any email address on your domain

---

## Step 3: Create an API Key

1. In the SendGrid dashboard, go to **Settings** → **API Keys**
2. Click **"Create API Key"** (top right)
3. Give it a name (e.g., "IndieBookShop Contact Form")
4. Select **"Full Access"** or **"Restricted Access"**:
   - **Full Access:** Simplest option, gives all permissions
   - **Restricted Access:** More secure, select only "Mail Send" permission
5. Click **"Create & View"**
6. **IMPORTANT:** Copy the API key immediately - you'll only see it once!
   - It will look like: `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - Save it securely (password manager, secure note, etc.)

---

## Step 4: Set Environment Variables

You need to set these environment variables in your deployment platform (Vercel, local `.env` file, etc.):

### For Local Development (.env file)

Create or update `.env` in your project root:

```bash
SENDGRID_API_KEY=SG.your_api_key_here
SENDGRID_FROM_EMAIL=noreply@indiebookshop.com
ADMIN_EMAIL=info@bluestonebrands.com
```

**Replace:**
- `SG.your_api_key_here` with the API key you copied in Step 3
- `noreply@indiebookshop.com` with the verified sender email from Step 2
- `info@bluestonebrands.com` is already correct (this is where contact form emails go)

### For Vercel Deployment

1. Go to your Vercel dashboard: [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add each variable:
   - **Key:** `SENDGRID_API_KEY`
     - **Value:** Your API key from Step 3
     - **Environment:** Production, Preview, Development (select all)
   - **Key:** `SENDGRID_FROM_EMAIL`
     - **Value:** Your verified sender email from Step 2
     - **Environment:** Production, Preview, Development (select all)
   - **Key:** `ADMIN_EMAIL`
     - **Value:** `info@bluestonebrands.com`
     - **Environment:** Production, Preview, Development (select all)
5. Click **"Save"** for each variable
6. **Important:** After adding variables, you need to redeploy:
   - Go to **Deployments** tab
   - Click the three dots (⋯) on the latest deployment
   - Click **"Redeploy"**

---

## Step 5: Test the Setup

### Test Locally

1. Make sure your `.env` file is set up correctly
2. Start your development server:
   ```bash
   npm run dev
   ```
3. Navigate to `http://localhost:3000/contact`
4. Fill out the contact form
5. Submit the form
6. Check the console for any errors
7. Check `info@bluestonebrands.com` inbox for the email

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

---

## Step 6: Verify Email Delivery

### Check SendGrid Activity

1. In SendGrid dashboard, go to **Activity**
2. You should see email delivery attempts
3. Green checkmarks = delivered successfully
4. Red X = failed (check error message)

### Common Issues

**Issue: "Invalid API Key"**
- Solution: Double-check the API key is correct and copied completely
- Make sure there are no extra spaces

**Issue: "Sender email not verified"**
- Solution: Make sure you verified the sender email in Step 2
- The `SENDGRID_FROM_EMAIL` must match the verified email exactly

**Issue: "Email not received"**
- Check spam/junk folder
- Check SendGrid Activity feed for delivery status
- Verify `info@bluestonebrands.com` is a valid, active email address
- Check Vercel function logs for errors

**Issue: "Rate limit exceeded"**
- Free tier: 100 emails/day
- Check your SendGrid usage in the dashboard
- Upgrade plan if needed

---

## Step 7: Email Template (Optional)

The contact form sends a formatted HTML email. The email includes:
- Sender's name and email
- Reason for contact
- Subject
- Message
- Reply-to is set to the sender's email for easy responses

You can customize the email template by editing:
- `server/email.ts` (for server-side)
- `api/routes-serverless.js` (for serverless/Vercel)

---

## Summary Checklist

- [ ] SendGrid account created and verified
- [ ] Sender email verified (Single Sender or Domain)
- [ ] API key created and saved securely
- [ ] Environment variables set in Vercel:
  - [ ] `SENDGRID_API_KEY`
  - [ ] `SENDGRID_FROM_EMAIL`
  - [ ] `ADMIN_EMAIL` (optional, defaults to info@bluestonebrands.com)
- [ ] Project redeployed after setting environment variables
- [ ] Test submission sent and received
- [ ] Checked SendGrid Activity feed for delivery status

---

## Security Best Practices

1. **Never commit API keys to git** - Always use environment variables
2. **Use Restricted Access API keys** when possible (only "Mail Send" permission)
3. **Rotate API keys periodically** (every 90 days recommended)
4. **Monitor SendGrid Activity** for suspicious activity
5. **Set up email alerts** in SendGrid for failed deliveries

---

## Support Resources

- **SendGrid Documentation:** [https://docs.sendgrid.com/](https://docs.sendgrid.com/)
- **SendGrid Support:** Available in dashboard (Help & Support)
- **API Reference:** [https://docs.sendgrid.com/api-reference](https://docs.sendgrid.com/api-reference)

---

## Current Configuration

Your contact form is configured to:
- **Send emails to:** `info@bluestonebrands.com`
- **From email:** Set via `SENDGRID_FROM_EMAIL` environment variable
- **Reply-to:** Sender's email address (so you can reply directly)
- **Rate limiting:** 5 submissions per 15 minutes per IP (prevents spam)

Once you complete these steps, your contact form will be fully functional!


