# Google AdSense Integration Guide

This guide explains how to integrate Google AdSense into your IndiebookShop website.

## Overview

AdSense integration requires **three complementary methods**:

1. **Meta Tag** - Site verification (one-time setup)
2. **Code Snippet** - Display ads on pages (reusable component)
3. **ads.txt** - Authorization file (required for programmatic ads)

All three are necessary for a complete AdSense setup.

---

## Step 1: Get Your AdSense Account

1. Sign up at [Google AdSense](https://www.google.com/adsense/start/)
2. Get approved (this can take a few days to weeks)
3. Once approved, you'll receive:
   - **Publisher ID**: `ca-pub-1234567890123456` (example)
   - **Ad Slot IDs**: Created when you set up ad units

---

## Step 2: Add Meta Tag for Verification

**File**: `client/index.html`

Replace `YOUR_PUBLISHER_ID` with your actual publisher ID:

```html
<meta name="google-adsense-account" content="ca-pub-1234567890123456">
```

This verifies site ownership with Google.

---

## Step 3: Create Ad Units in AdSense

1. Go to AdSense Dashboard → Ads → By ad unit
2. Click "Create ad unit"
3. Choose ad type (Display ads, In-article, etc.)
4. Configure size and style
5. Save and get your **Ad Slot ID** (e.g., `1234567890`)

---

## Step 4: Add ads.txt File

**File**: `client/public/ads.txt`

After AdSense approval, Google will provide the exact line to add. Format:

```
google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0
```

Replace the placeholder in the file with your actual line.

**Important**: This file must be accessible at `https://yourdomain.com/ads.txt`

---

## Step 5: Add Ads to Your Pages

### Option A: Manual Ad Placement (Recommended)

Use the `<AdSense>` component to place ads exactly where you want them:

```tsx
import { AdSense } from '@/components/AdSense';

// In your page component
<AdSense 
  adClient="ca-pub-1234567890123456"
  adSlot="1234567890"
  className="my-8"
/>
```

**Good placement locations:**
- After the hero section
- Between content sections
- In the sidebar (if you have one)
- At the bottom of articles/pages

**Example - Adding to Directory page:**

```tsx
// In client/src/pages/Directory.tsx
import { AdSense } from '@/components/AdSense';

// After the Hero section
<Hero />
<AdSense 
  adClient="ca-pub-1234567890123456"
  adSlot="1234567890"
  className="container mx-auto px-4 my-8"
/>
```

### Option B: Auto Ads (Automatic Placement)

Add once to your main App component for automatic ad placement:

```tsx
// In client/src/App.tsx
import { AdSenseAutoAds } from '@/components/AdSense';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdSenseAutoAds adClient="ca-pub-1234567890123456" />
      {/* rest of your app */}
    </QueryClientProvider>
  );
}
```

**Note**: Auto Ads gives Google control over ad placement. Manual placement gives you more control.

---

## Step 6: Environment Variables (Optional)

For better security and easier management, you can use environment variables:

1. Create `.env` file:
```env
VITE_ADSENSE_PUBLISHER_ID=ca-pub-1234567890123456
VITE_ADSENSE_SLOT_ID=1234567890
```

2. Update your component usage:
```tsx
<AdSense 
  adClient={import.meta.env.VITE_ADSENSE_PUBLISHER_ID}
  adSlot={import.meta.env.VITE_ADSENSE_SLOT_ID}
/>
```

---

## Best Practices

### Ad Placement Guidelines

1. **Don't place ads too close together** - Maintain spacing
2. **Above the fold** - Place at least one ad where users see it immediately
3. **Between content** - Natural breaks in content work well
4. **Mobile-friendly** - Ensure ads don't break mobile layout
5. **Limit ads per page** - Google recommends 3-4 ads per page max

### Performance

- Ads load asynchronously (won't block page rendering)
- The component only loads the AdSense script once
- Ads are responsive by default

### Compliance

- Follow [AdSense policies](https://support.google.com/adsense/answer/48182)
- Don't click your own ads
- Don't ask users to click ads
- Ensure content quality meets AdSense standards

---

## Testing

1. **Before going live**: Use AdSense test mode or test ads
2. **Check mobile**: Ensure ads display correctly on mobile devices
3. **Verify ads.txt**: Visit `https://yourdomain.com/ads.txt` to confirm it's accessible
4. **Check console**: Look for any AdSense errors in browser console

---

## Troubleshooting

### Ads not showing?

1. **Check publisher ID** - Ensure it's correct in meta tag and component
2. **Verify ads.txt** - Must be accessible at `/ads.txt`
3. **Ad blocker** - Disable ad blockers for testing
4. **Approval status** - Ensure your AdSense account is fully approved
5. **Ad unit status** - Check that ad units are active in AdSense dashboard

### Console errors?

- Check that the AdSense script is loading
- Verify ad slot IDs are correct
- Ensure you're not exceeding ad limits per page

---

## Files Modified/Created

- ✅ `client/index.html` - Added meta tag for verification
- ✅ `client/public/ads.txt` - Authorization file
- ✅ `client/src/components/AdSense.tsx` - Reusable ad component

---

## Next Steps

1. Replace `YOUR_PUBLISHER_ID` in `index.html` with your actual ID
2. Update `ads.txt` with your actual authorization line (after approval)
3. Add `<AdSense>` components to your pages where you want ads
4. Test thoroughly before going live
5. Monitor performance in AdSense dashboard

---

## Support

- [AdSense Help Center](https://support.google.com/adsense/)
- [AdSense Policies](https://support.google.com/adsense/answer/48182)
- [ads.txt Specification](https://iabtechlab.com/ads-txt/)

