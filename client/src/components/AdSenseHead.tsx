import { Helmet } from 'react-helmet-async';

/**
 * AdSenseHead Component
 * 
 * Ensures AdSense verification meta tag and script are in the <head> on every page.
 * This component should be added once to your main App component.
 * 
 * The script is also in index.html as a fallback, but this ensures it's
 * properly added via React Helmet for all pages.
 */
export const AdSenseHead = () => {
  return (
    <Helmet>
      {/* Google AdSense Verification Meta Tag */}
      <meta name="google-adsense-account" content="ca-pub-4357894821158922" />
      
      {/* Google AdSense Script */}
      <script 
        async 
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4357894821158922"
        crossOrigin="anonymous"
      />
    </Helmet>
  );
};

