import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string[];
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: string; // 'website', 'article', 'book', 'profile', 'business.business'
  ogImageAlt?: string;
  ogImageWidth?: number;
  ogImageHeight?: number;
  twitterCard?: string; // 'summary', 'summary_large_image', 'app', 'player'
  twitterSite?: string;
  twitterCreator?: string;
  articlePublishedTime?: string; // ISO date string
  articleModifiedTime?: string; // ISO date string
  articleAuthor?: string; // URL to profile
  articleSection?: string;
  articleTags?: string[];
}

export const SEO = ({
  title,
  description,
  keywords = [],
  canonicalUrl,
  ogImage,
  ogType = 'website',
  ogImageAlt,
  ogImageWidth,
  ogImageHeight,
  twitterCard = 'summary_large_image',
  twitterSite = '@indiebookshop',
  twitterCreator,
  articlePublishedTime,
  articleModifiedTime,
  articleAuthor,
  articleSection,
  articleTags = [],
}: SEOProps) => {
  // Ensure all values are strings and filter out any invalid values
  const safeTitle = String(title || 'IndiebookShop.com');
  const safeDescription = String(description || '');
  const safeKeywords = Array.isArray(keywords) 
    ? keywords.filter(k => k != null && typeof k !== 'symbol').map(k => String(k))
    : [];
  const keywordsString = safeKeywords.join(', ');
  
  // Format title to include site name
  const fullTitle = `${safeTitle} | IndiebookShop.com`;
  
  // Make sure we're using string values for all props
  const safeOgType = String(ogType || 'website');
  const safeTwitterCard = String(twitterCard || 'summary_large_image');
  const safeSite = String(twitterSite || '@indiebookshop');
  const safeCreator = twitterCreator ? String(twitterCreator) : undefined;
  
  const isArticle = safeOgType === 'article';
  
  return (
    <Helmet>
      <title>{fullTitle}</title>
      {safeDescription && <meta name="description" content={safeDescription} />}
      {keywordsString && <meta name="keywords" content={keywordsString} />}
      
      {/* Canonical URL */}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      
      {/* Open Graph Tags */}
      <meta property="og:title" content={fullTitle} />
      {safeDescription && <meta property="og:description" content={safeDescription} />}
      <meta property="og:type" content={safeOgType} />
      {canonicalUrl && <meta property="og:url" content={String(canonicalUrl)} />}
      {ogImage && <meta property="og:image" content={String(ogImage)} />}
      {ogImage && ogImageAlt && <meta property="og:image:alt" content={String(ogImageAlt)} />}
      {ogImage && ogImageWidth && <meta property="og:image:width" content={String(ogImageWidth)} />}
      {ogImage && ogImageHeight && <meta property="og:image:height" content={String(ogImageHeight)} />}
      
      {/* Site-wide Open Graph info */}
      <meta property="og:site_name" content="IndiebookShop.com" />
      <meta property="og:locale" content="en_US" />
      
      {/* Article specific Open Graph */}
      {isArticle && articlePublishedTime && (
        <meta property="article:published_time" content={String(articlePublishedTime)} />
      )}
      {isArticle && articleModifiedTime && (
        <meta property="article:modified_time" content={String(articleModifiedTime)} />
      )}
      {isArticle && articleAuthor && (
        <meta property="article:author" content={String(articleAuthor)} />
      )}
      {isArticle && articleSection && (
        <meta property="article:section" content={String(articleSection)} />
      )}
      {isArticle && articleTags && articleTags.length > 0 && articleTags
        .filter(tag => tag != null && typeof tag !== 'symbol')
        .map((tag, index) => (
          <meta property="article:tag" content={String(tag)} key={`tag-${index}`} />
        ))}
      
      {/* Twitter Card Tags */}
      <meta name="twitter:card" content={safeTwitterCard} />
      <meta name="twitter:title" content={fullTitle} />
      {safeDescription && <meta name="twitter:description" content={safeDescription} />}
      {twitterSite && <meta name="twitter:site" content={safeSite} />}
      {twitterCreator && <meta name="twitter:creator" content={safeCreator} />}
      {ogImage && <meta name="twitter:image" content={String(ogImage)} />}
      {ogImageAlt && <meta name="twitter:image:alt" content={String(ogImageAlt)} />}
      
      {/* Google AdSense - Verification and Script */}
      <meta name="google-adsense-account" content="ca-pub-4357894821158922" />
      <script 
        async 
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4357894821158922"
        crossOrigin="anonymous"
      />
    </Helmet>
  );
};