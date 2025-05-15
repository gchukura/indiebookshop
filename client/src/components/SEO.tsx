import { Helmet } from 'react-helmet';

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
  // Join keywords for meta tag
  const keywordsString = keywords.join(', ');
  
  // Format title to include site name
  const fullTitle = `${title} | IndiebookShop.com`;
  
  // Make sure we're using string values for all props
  const safeOgType = String(ogType || 'website');
  const safeTwitterCard = String(twitterCard || 'summary_large_image');
  const safeSite = String(twitterSite || '@indiebookshop');
  const safeCreator = twitterCreator ? String(twitterCreator) : undefined;
  
  const isArticle = safeOgType === 'article';
  
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords.length > 0 && <meta name="keywords" content={keywordsString} />}
      
      {/* Canonical URL */}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      
      {/* Open Graph Tags */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={safeOgType} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      {ogImage && (
        <>
          <meta property="og:image" content={ogImage} />
          {ogImageAlt && <meta property="og:image:alt" content={ogImageAlt} />}
          {ogImageWidth && <meta property="og:image:width" content={String(ogImageWidth)} />}
          {ogImageHeight && <meta property="og:image:height" content={String(ogImageHeight)} />}
        </>
      )}
      
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
      {isArticle && articleTags.map((tag, index) => (
        <meta property="article:tag" content={String(tag)} key={index} />
      ))}
      
      {/* Twitter Card Tags */}
      <meta name="twitter:card" content={safeTwitterCard} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {twitterSite && <meta name="twitter:site" content={safeSite} />}
      {twitterCreator && <meta name="twitter:creator" content={safeCreator} />}
      {ogImage && <meta name="twitter:image" content={ogImage} />}
      {ogImageAlt && <meta name="twitter:image:alt" content={String(ogImageAlt)} />}
    </Helmet>
  );
};