import { useEffect } from 'react';

interface AdSenseProps {
  /**
   * Your AdSense publisher ID (e.g., "ca-pub-1234567890123456")
   * Get this from your AdSense account
   * Default: "ca-pub-4357894821158922"
   */
  adClient?: string;
  
  /**
   * Ad slot ID (e.g., "1234567890")
   * Create ad units in AdSense to get slot IDs
   */
  adSlot: string;
  
  /**
   * Ad format (e.g., "auto", "rectangle", "vertical", "horizontal")
   * Default: "auto"
   */
  adFormat?: string;
  
  /**
   * Ad style (e.g., "display")
   * Default: "display"
   */
  adStyle?: string;
  
  /**
   * Whether the ad is responsive
   * Default: true
   */
  responsive?: boolean;
  
  /**
   * Full width of the ad
   * Default: true
   */
  fullWidthResponsive?: boolean;
  
  /**
   * Custom className for the ad container
   */
  className?: string;
}

/**
 * AdSense Component
 * 
 * Displays Google AdSense ads on your pages.
 * 
 * Usage:
 * ```tsx
 * <AdSense 
 *   adClient="ca-pub-1234567890123456"
 *   adSlot="1234567890"
 *   className="my-4"
 * />
 * ```
 * 
 * Make sure to:
 * 1. Replace adClient with your actual publisher ID
 * 2. Create ad units in AdSense and use the slot ID
 * 3. Add the verification meta tag to index.html
 * 4. Create an ads.txt file in the public directory
 */
export const AdSense = ({
  adClient = 'ca-pub-4357894821158922', // Default publisher ID
  adSlot,
  adFormat = 'auto',
  adStyle = 'display',
  responsive = true,
  fullWidthResponsive = true,
  className = '',
}: AdSenseProps) => {
  useEffect(() => {
    // Script is already loaded in index.html, so we just need to push the ad
    // Push ad to adsbygoogle array
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch (err) {
      console.error('AdSense error:', err);
    }
  }, [adClient, adSlot]);

  if (!adSlot) {
    console.warn('AdSense: adSlot is required');
    return null;
  }

  return (
    <div className={`adsense-container ${className}`}>
      <ins
        className="adsbygoogle"
        style={{
          display: 'block',
          ...(responsive && fullWidthResponsive ? {} : { width: '100%', height: '100%' }),
        }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={fullWidthResponsive ? 'true' : 'false'}
      />
    </div>
  );
};

/**
 * AdSense Auto Ads Component
 * 
 * Automatically places ads on your pages using AdSense Auto Ads.
 * Only add this ONCE to your main layout (e.g., App.tsx).
 * 
 * Usage:
 * ```tsx
 * <AdSenseAutoAds adClient="ca-pub-1234567890123456" />
 * ```
 */
export const AdSenseAutoAds = ({ adClient = 'ca-pub-4357894821158922' }: { adClient?: string }) => {
  // Script is already loaded in index.html, so this component is just a placeholder
  // Auto ads will work automatically once the script is loaded
  return null;
};

