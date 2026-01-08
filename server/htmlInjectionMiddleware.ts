import { Request, Response, NextFunction } from 'express';
import { log } from './vite';
import { generateBookshopMetaTags } from './metaTagGenerator';
import { readFileSync } from 'fs';
import { generateSlugFromName, escapeHtml } from '@shared/utils';

/**
 * Note: generateSlugFromName is now imported from @shared/utils
 * to ensure consistency between server and client implementations
 */

/**
 * Generate SEO body content for homepage
 * This content is visible to search engines before React hydration
 * Includes links to canonical bookshop URLs for better internal linking
 */
function generateHomepageSeoContent(bookshops?: any[]): string {
  let bookshopLinks = '';
  
  // Add links to featured bookshops if available (up to 10 for SEO)
  if (bookshops && bookshops.length > 0) {
    const featuredBookshops = bookshops.slice(0, 10);
    bookshopLinks = '<div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0;"><h2 style="font-size: 1.5em; margin-bottom: 15px; color: #1a1a1a;">Featured Independent Bookshops</h2><ul style="list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 10px;">';
    
    featuredBookshops.forEach((bookshop) => {
      if (bookshop && bookshop.name) {
        const slug = generateSlugFromName(bookshop.name);
        if (slug) {
          const location = [bookshop.city, bookshop.state].filter(Boolean).join(', ');
          // Escape HTML to prevent XSS attacks
          const escapedName = escapeHtml(bookshop.name);
          const escapedLocation = location ? ` - ${escapeHtml(location)}` : '';
          bookshopLinks += `<li style="margin: 0;"><a href="/bookshop/${slug}" style="color: #2A6B7C; text-decoration: none; font-weight: 500;">${escapedName}${escapedLocation}</a></li>`;
        }
      }
    });
    
    bookshopLinks += '</ul></div>';
  }
  
  return `
    <noscript>
      <style>
        .seo-content { max-width: 1200px; margin: 0 auto; padding: 20px; font-family: system-ui, -apple-system, sans-serif; }
        .seo-content h1 { font-size: 2em; margin-bottom: 20px; color: #1a1a1a; }
        .seo-content p { margin-bottom: 15px; line-height: 1.6; color: #333; }
        .seo-content nav { margin: 20px 0; padding: 15px 0; border-top: 1px solid #e0e0e0; }
        .seo-content nav a { margin-right: 20px; color: #2A6B7C; text-decoration: none; font-weight: 500; }
        .seo-content nav a:hover { text-decoration: underline; }
      </style>
      <div class="seo-content">
        <h1>Discover Independent Bookshops Across America</h1>
        <p>Welcome to IndiebookShop.com, the most comprehensive directory of independent bookshops in the United States and Canada. We feature over 3,000 carefully curated independent bookstores across all 50 states, helping book lovers discover unique literary spaces in their communities and while traveling.</p>
        <p>Independent bookshops are more than just stores—they are cultural hubs that foster community, support local economies, and celebrate the diversity of literature. Unlike chain stores, indie bookshops offer personalized recommendations, expert curation, and a sense of belonging that algorithms can never replicate.</p>
        <p>Our directory makes it easy to find independent bookshops by location, specialty, and features. Whether you're looking for a bookshop with a coffee shop, rare books, children's sections, or reading spaces, you can search our interactive map or browse by state, city, or category.</p>
        <p>Each bookshop listing includes detailed information about location, hours, contact information, and special features. Many listings also feature photos, descriptions, and links to bookshop websites and social media profiles.</p>
        <p>Supporting independent bookshops helps preserve literary culture and keeps money in local communities. When you shop at an indie bookstore, you're supporting local jobs, local authors, and the unique character of your neighborhood.</p>
        ${bookshopLinks}
        <nav>
          <a href="/directory">Browse All Bookshops</a>
          <a href="/about">About Us</a>
          <a href="/contact">Contact</a>
          <a href="/submit-bookshop">Add Your Bookshop</a>
        </nav>
      </div>
    </noscript>
  `;
}

/**
 * Generate SEO body content for directory page
 * Includes links to canonical bookshop URLs for better internal linking
 */
function generateDirectorySeoContent(bookshops?: any[]): string {
  let bookshopLinks = '';
  
  // Add links to popular bookshops if available (up to 15 for SEO)
  if (bookshops && bookshops.length > 0) {
    // Sort by rating/reviews if available, or take first 15
    const sortedBookshops = [...bookshops]
      .sort((a, b) => {
        // Prioritize bookshops with higher ratings or more reviews
        const aScore = (a.rating || 0) * 10 + (a.reviewCount || 0);
        const bScore = (b.rating || 0) * 10 + (b.reviewCount || 0);
        return bScore - aScore;
      })
      .slice(0, 15);
    
    bookshopLinks = '<div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0;"><h2 style="font-size: 1.5em; margin-bottom: 15px; color: #1a1a1a;">Popular Independent Bookshops</h2><ul style="list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 10px;">';
    
    sortedBookshops.forEach((bookshop) => {
      if (bookshop && bookshop.name) {
        const slug = generateSlugFromName(bookshop.name);
        if (slug) {
          const location = [bookshop.city, bookshop.state].filter(Boolean).join(', ');
          // Escape HTML to prevent XSS attacks
          const escapedName = escapeHtml(bookshop.name);
          const escapedLocation = location ? ` - ${escapeHtml(location)}` : '';
          bookshopLinks += `<li style="margin: 0;"><a href="/bookshop/${slug}" style="color: #2A6B7C; text-decoration: none; font-weight: 500;">${escapedName}${escapedLocation}</a></li>`;
        }
      }
    });
    
    bookshopLinks += '</ul></div>';
  }
  
  return `
    <noscript>
      <style>
        .seo-content { max-width: 1200px; margin: 0 auto; padding: 20px; font-family: system-ui, -apple-system, sans-serif; }
        .seo-content h1 { font-size: 2em; margin-bottom: 20px; color: #1a1a1a; }
        .seo-content p { margin-bottom: 15px; line-height: 1.6; color: #333; }
        .seo-content nav { margin: 20px 0; padding: 15px 0; border-top: 1px solid #e0e0e0; }
        .seo-content nav a { margin-right: 20px; color: #2A6B7C; text-decoration: none; font-weight: 500; }
        .seo-content nav a:hover { text-decoration: underline; }
      </style>
      <div class="seo-content">
        <h1>Browse Our Directory of Independent Bookshops</h1>
        <p>Explore our comprehensive directory of over 3,000 independent bookshops across the United States and Canada. Use our interactive map to find bookshops near you, or browse by state, city, or specialty features.</p>
        <p>Our directory includes detailed information about each independent bookstore, including location, contact information, hours of operation, and special features like coffee shops, reading spaces, rare book collections, and children's sections.</p>
        <p>Whether you're looking for a cozy neighborhood bookshop, a large independent bookstore with extensive selections, or a specialty shop focusing on specific genres or interests, our directory helps you discover the perfect literary destination.</p>
        <p>Each bookshop page provides comprehensive details to help you plan your visit, including address, phone number, website links, and descriptions of what makes each shop unique. Many listings also include photos and links to bookshop events and social media profiles.</p>
        <p>Supporting independent bookshops strengthens local communities and preserves literary culture. When you shop at an indie bookstore, you're supporting local jobs, local authors, and the unique character of your neighborhood.</p>
        ${bookshopLinks}
        <nav>
          <a href="/">Home</a>
          <a href="/about">About Us</a>
          <a href="/contact">Contact</a>
          <a href="/submit-bookshop">Add Your Bookshop</a>
        </nav>
      </div>
    </noscript>
  `;
}

/**
 * Generate SEO body content for About page
 */
function generateAboutSeoContent(): string {
  return `
    <noscript>
      <style>
        .seo-content { max-width: 1200px; margin: 0 auto; padding: 20px; font-family: system-ui, -apple-system, sans-serif; }
        .seo-content h1 { font-size: 2em; margin-bottom: 20px; color: #1a1a1a; }
        .seo-content p { margin-bottom: 15px; line-height: 1.6; color: #333; }
        .seo-content nav { margin: 20px 0; padding: 15px 0; border-top: 1px solid #e0e0e0; }
        .seo-content nav a { margin-right: 20px; color: #2A6B7C; text-decoration: none; font-weight: 500; }
        .seo-content nav a:hover { text-decoration: underline; }
      </style>
      <div class="seo-content">
        <h1>About IndiebookShop.com</h1>
        <p>IndiebookShop.com is dedicated to supporting and promoting independent bookshops across America. Our mission is to connect readers with local independent booksellers, helping preserve the unique character and community value that indie bookstores bring to neighborhoods nationwide.</p>
        <p>We believe that independent bookshops are essential cultural institutions that foster community, support local economies, and celebrate the diversity of literature. Unlike chain stores, indie bookshops offer personalized recommendations, expert curation, and a sense of belonging that creates lasting connections between readers and their local literary community.</p>
        <p>Our comprehensive directory features over 3,000 carefully curated independent bookstores across all 50 U.S. states and Canada. Each listing includes detailed information about location, hours, contact details, and special features, making it easy for book lovers to discover their next favorite bookshop.</p>
        <p>We work closely with bookshop owners and the independent bookselling community to ensure our directory is accurate and up-to-date. Bookshop owners can submit their stores or update existing listings to help readers find them.</p>
        <p>By supporting independent bookshops, we're helping preserve literary culture and keeping money in local communities. When you shop at an indie bookstore, you're supporting local jobs, local authors, and the unique character of your neighborhood.</p>
        <nav>
          <a href="/">Home</a>
          <a href="/directory">Browse Directory</a>
          <a href="/contact">Contact Us</a>
          <a href="/submit-bookshop">Add Your Bookshop</a>
        </nav>
      </div>
    </noscript>
  `;
}

/**
 * Generate SEO body content for Contact page
 */
function generateContactSeoContent(): string {
  return `
    <noscript>
      <style>
        .seo-content { max-width: 1200px; margin: 0 auto; padding: 20px; font-family: system-ui, -apple-system, sans-serif; }
        .seo-content h1 { font-size: 2em; margin-bottom: 20px; color: #1a1a1a; }
        .seo-content p { margin-bottom: 15px; line-height: 1.6; color: #333; }
        .seo-content nav { margin: 20px 0; padding: 15px 0; border-top: 1px solid #e0e0e0; }
        .seo-content nav a { margin-right: 20px; color: #2A6B7C; text-decoration: none; font-weight: 500; }
        .seo-content nav a:hover { text-decoration: underline; }
      </style>
      <div class="seo-content">
        <h1>Contact IndiebookShop.com</h1>
        <p>We'd love to hear from you! Whether you have questions about our directory, want to submit or update a bookshop listing, have suggestions for improving our service, or just want to share your love of independent bookstores, we're here to help.</p>
        <p>Our team is committed to supporting the independent bookselling community and making it easier for readers to discover local bookshops. If you own or manage an independent bookstore, we can help you get listed in our directory or update your existing listing with current information, photos, and special features.</p>
        <p>If you notice any incorrect information in our directory, please let us know so we can keep our listings accurate and helpful for book lovers everywhere. We rely on the community to help us maintain the quality and completeness of our directory.</p>
        <p>For general inquiries, bookshop submissions, corrections, or feedback, please use our contact form. We typically respond within a few business days and appreciate your patience as we work to support the independent bookselling community.</p>
        <p>Thank you for supporting independent bookshops and helping us build the most comprehensive directory of indie bookstores in America. Together, we can help preserve the unique character and community value that independent bookshops bring to neighborhoods across the country.</p>
        <nav>
          <a href="/">Home</a>
          <a href="/directory">Browse Directory</a>
          <a href="/about">About Us</a>
          <a href="/submit-bookshop">Submit Bookshop</a>
        </nav>
      </div>
    </noscript>
  `;
}

/**
 * Generate SEO body content for Events page
 */
function generateEventsSeoContent(): string {
  return `
    <noscript>
      <style>
        .seo-content { max-width: 1200px; margin: 0 auto; padding: 20px; font-family: system-ui, -apple-system, sans-serif; }
        .seo-content h1 { font-size: 2em; margin-bottom: 20px; color: #1a1a1a; }
        .seo-content p { margin-bottom: 15px; line-height: 1.6; color: #333; }
        .seo-content nav { margin: 20px 0; padding: 15px 0; border-top: 1px solid #e0e0e0; }
        .seo-content nav a { margin-right: 20px; color: #2A6B7C; text-decoration: none; font-weight: 500; }
        .seo-content nav a:hover { text-decoration: underline; }
      </style>
      <div class="seo-content">
        <h1>Independent Bookshop Events Calendar</h1>
        <p>Discover literary events happening at independent bookshops across America. Our events calendar features author readings, book signings, book clubs, poetry readings, children's story time, workshops, and other literary gatherings at indie bookstores nationwide.</p>
        <p>Independent bookshops are vibrant community hubs that host a wide variety of literary events throughout the year. From bestselling author appearances to local writer showcases, from book club discussions to children's story hours, indie bookstores offer unique opportunities to connect with authors, fellow readers, and your local literary community.</p>
        <p>Our events calendar makes it easy to find upcoming literary events near you. Browse by date, location, or event type to discover author readings, book signings, book clubs, poetry readings, workshops, and more happening at independent bookshops in your area.</p>
        <p>If you're a bookshop owner or event organizer, you can submit your upcoming events to our calendar to help readers discover your literary programming. We welcome submissions for author readings, book signings, book clubs, poetry readings, children's story time, workshops, and other literary events.</p>
        <p>Attending events at independent bookshops is a great way to support local booksellers, meet authors, discover new books, and connect with your local reading community. Check our calendar regularly to stay informed about literary events happening at indie bookstores near you.</p>
        <nav>
          <a href="/">Home</a>
          <a href="/directory">Browse Bookshops</a>
          <a href="/submit-event">Submit Event</a>
          <a href="/about">About Us</a>
        </nav>
      </div>
    </noscript>
  `;
}

/**
 * Generate SEO body content for Blog page
 */
function generateBlogSeoContent(): string {
  return `
    <noscript>
      <style>
        .seo-content { max-width: 1200px; margin: 0 auto; padding: 20px; font-family: system-ui, -apple-system, sans-serif; }
        .seo-content h1 { font-size: 2em; margin-bottom: 20px; color: #1a1a1a; }
        .seo-content p { margin-bottom: 15px; line-height: 1.6; color: #333; }
        .seo-content nav { margin: 20px 0; padding: 15px 0; border-top: 1px solid #e0e0e0; }
        .seo-content nav a { margin-right: 20px; color: #2A6B7C; text-decoration: none; font-weight: 500; }
        .seo-content nav a:hover { text-decoration: underline; }
      </style>
      <div class="seo-content">
        <h1>Independent Bookshop Blog</h1>
        <p>Read stories, interviews, and insights about independent bookshops across America. Our blog celebrates the unique character, community value, and cultural importance of indie bookstores, featuring articles about local booksellers, author events, bookshop culture, and the literary community.</p>
        <p>Independent bookshops are more than just stores—they are cultural institutions that foster community, support local economies, and celebrate the diversity of literature. Our blog explores the stories behind these beloved community spaces, from the booksellers who curate their collections to the authors who visit, from the readers who gather for events to the communities that form around these literary hubs.</p>
        <p>Discover articles about the history of independent bookselling, profiles of notable indie bookshops, interviews with booksellers and authors, stories about bookshop cats and other bookstore traditions, and insights into how independent bookstores contribute to local culture and community.</p>
        <p>Whether you're a book lover, a bookseller, an author, or simply someone who appreciates the unique character of independent bookshops, our blog offers engaging content about the people, places, and stories that make indie bookstores special.</p>
        <p>Stay connected with the independent bookselling community through our blog, and discover the stories that celebrate the cultural importance and community value of independent bookshops across America.</p>
        <nav>
          <a href="/">Home</a>
          <a href="/directory">Browse Bookshops</a>
          <a href="/events">View Events</a>
          <a href="/about">About Us</a>
        </nav>
      </div>
    </noscript>
  `;
}

/**
 * Generate SEO body content for Submit Bookshop page
 */
function generateSubmitBookshopSeoContent(): string {
  return `
    <noscript>
      <style>
        .seo-content { max-width: 1200px; margin: 0 auto; padding: 20px; font-family: system-ui, -apple-system, sans-serif; }
        .seo-content h1 { font-size: 2em; margin-bottom: 20px; color: #1a1a1a; }
        .seo-content p { margin-bottom: 15px; line-height: 1.6; color: #333; }
        .seo-content nav { margin: 20px 0; padding: 15px 0; border-top: 1px solid #e0e0e0; }
        .seo-content nav a { margin-right: 20px; color: #2A6B7C; text-decoration: none; font-weight: 500; }
        .seo-content nav a:hover { text-decoration: underline; }
      </style>
      <div class="seo-content">
        <h1>Submit Your Independent Bookshop</h1>
        <p>Help us grow our directory of independent bookshops across America by submitting your bookstore. Our comprehensive directory helps readers discover local indie bookstores, and we're always looking to add new listings and update existing ones with current information.</p>
        <p>If you own or manage an independent bookstore, we invite you to submit your shop to our directory. Our free listing service helps book lovers find your store, learn about your special features and services, and discover what makes your bookshop unique.</p>
        <p>To submit your bookshop, please provide information about your store's name, location, contact details, hours of operation, website, and any special features like coffee shops, reading spaces, rare book collections, children's sections, or other amenities that make your bookshop special.</p>
        <p>We review all submissions to ensure our directory maintains high quality and accuracy. Once approved, your bookshop will appear in our directory, making it easier for readers to discover and visit your store. You can also update your listing at any time if your information changes.</p>
        <p>By listing your independent bookshop in our directory, you're helping readers discover local bookstores and supporting the independent bookselling community. Together, we can help preserve the unique character and community value that indie bookshops bring to neighborhoods across America.</p>
        <nav>
          <a href="/">Home</a>
          <a href="/directory">Browse Directory</a>
          <a href="/about">About Us</a>
          <a href="/contact">Contact</a>
        </nav>
      </div>
    </noscript>
  `;
}

/**
 * Generate SEO body content for Submit Event page
 */
function generateSubmitEventSeoContent(): string {
  return `
    <noscript>
      <style>
        .seo-content { max-width: 1200px; margin: 0 auto; padding: 20px; font-family: system-ui, -apple-system, sans-serif; }
        .seo-content h1 { font-size: 2em; margin-bottom: 20px; color: #1a1a1a; }
        .seo-content p { margin-bottom: 15px; line-height: 1.6; color: #333; }
        .seo-content nav { margin: 20px 0; padding: 15px 0; border-top: 1px solid #e0e0e0; }
        .seo-content nav a { margin-right: 20px; color: #2A6B7C; text-decoration: none; font-weight: 500; }
        .seo-content nav a:hover { text-decoration: underline; }
      </style>
      <div class="seo-content">
        <h1>Submit a Bookshop Event</h1>
        <p>Share your independent bookshop's upcoming literary events with our community. Our events calendar helps readers discover author readings, book signings, book clubs, poetry readings, children's story time, workshops, and other literary gatherings happening at indie bookstores across America.</p>
        <p>If you're hosting a literary event at your independent bookstore, we invite you to submit it to our events calendar. Our free event listing service helps readers discover your programming and encourages attendance at your bookshop's literary events.</p>
        <p>To submit an event, please provide information about the event date and time, location (bookshop name and address), event type (author reading, book signing, book club, etc.), author or book details if applicable, and any special information like registration requirements or admission fees.</p>
        <p>We welcome submissions for a wide variety of literary events, including author readings and book signings, book club meetings, poetry readings, children's story time, writing workshops, literary festivals, and other book-related gatherings at independent bookshops.</p>
        <p>By submitting your events to our calendar, you're helping readers discover literary programming at independent bookstores and supporting the vibrant community of book lovers, authors, and booksellers that makes indie bookshops special.</p>
        <nav>
          <a href="/events">View Events</a>
          <a href="/directory">Browse Bookshops</a>
          <a href="/submit-bookshop">Submit Bookshop</a>
          <a href="/about">About Us</a>
        </nav>
      </div>
    </noscript>
  `;
}

/**
 * Inject SEO body content into HTML before the root div
 */
function injectSeoBodyContent(html: string, seoContent: string): string {
  if (!html || !seoContent) return html;
  
  // Check if SEO content is already injected
  if (html.includes('<!-- Server-side injected SEO body content -->')) {
    return html;
  }
  
  // Find <div id="root"> and inject before it
  const rootDivPattern = /<div\s+id=["']root["'][^>]*>/i;
  const rootDivMatch = html.match(rootDivPattern);
  
  if (rootDivMatch) {
    const rootDivTag = rootDivMatch[0];
    const seoContentWithMarker = `<!-- Server-side injected SEO body content -->\n${seoContent}`;
    html = html.replace(rootDivTag, seoContentWithMarker + '\n' + rootDivTag);
  } else if (html.includes('</body>')) {
    // Fallback: inject before </body>
    html = html.replace('</body>', `<!-- Server-side injected SEO body content -->\n${seoContent}\n</body>`);
  }
  
  return html;
}

/**
 * Helper function to process and inject meta tags/data into HTML
 */
function processHtml(body: string, req: Request, res: Response): string {
  try {
    // Get preloaded data
    const preloadedData = res.locals.preloadedData;
    
    // Check if this is a bookshop detail page
    // Use originalUrl because req.path may be "/" for static file serving
    const isBookshopPage = req.originalUrl.match(/^\/bookshop\//);
    const isHomepage = req.path === '/' || req.originalUrl === '/';
    const isDirectory = req.path === '/directory' || req.originalUrl === '/directory';
    const isAbout = req.path === '/about' || req.originalUrl === '/about';
    const isContact = req.path === '/contact' || req.originalUrl === '/contact';
    const isEvents = req.path === '/events' || req.originalUrl === '/events';
    const isBlog = req.path === '/blog' || req.originalUrl === '/blog';
    const isSubmitBookshop = req.path === '/submit-bookshop' || req.originalUrl === '/submit-bookshop' || req.path === '/submit' || req.originalUrl === '/submit';
    const isSubmitEvent = req.path === '/submit-event' || req.originalUrl === '/submit-event';
    
    // Generate and inject meta tags for bookshop pages
    if (isBookshopPage) {
      if (preloadedData?.bookshop) {
        const metaTags = generateBookshopMetaTags(preloadedData.bookshop);
        
        // Inject meta tags before the closing </head> tag
        // Replace the first occurrence to avoid conflicts
        if (body.includes('</head>')) {
          body = body.replace('</head>', `${metaTags}</head>`);
          log(`Injected meta tags for bookshop: ${preloadedData.bookshop.name}`, 'html');
        }
      } else {
        log(`Bookshop page detected but no bookshop data in preloadedData for ${req.originalUrl}`, 'html');
        log(`PreloadedData keys: ${Object.keys(preloadedData || {}).join(', ')}`, 'html');
      }
    }
    
    // Inject SEO body content for all static pages to prevent duplicate content
    // Include bookshop links for homepage and directory to improve internal linking
    if (isHomepage) {
      const featuredBookshops = preloadedData?.featuredBookshops || [];
      const seoContent = generateHomepageSeoContent(featuredBookshops);
      body = injectSeoBodyContent(body, seoContent);
      log(`Injected SEO body content for homepage with ${featuredBookshops.length} bookshop links`, 'html');
    } else if (isDirectory) {
      const popularBookshops = preloadedData?.popularBookshops || [];
      const seoContent = generateDirectorySeoContent(popularBookshops);
      body = injectSeoBodyContent(body, seoContent);
      log(`Injected SEO body content for directory with ${popularBookshops.length} bookshop links`, 'html');
    } else if (isAbout) {
      const seoContent = generateAboutSeoContent();
      body = injectSeoBodyContent(body, seoContent);
      log('Injected SEO body content for about page', 'html');
    } else if (isContact) {
      const seoContent = generateContactSeoContent();
      body = injectSeoBodyContent(body, seoContent);
      log('Injected SEO body content for contact page', 'html');
    } else if (isEvents) {
      const seoContent = generateEventsSeoContent();
      body = injectSeoBodyContent(body, seoContent);
      log('Injected SEO body content for events page', 'html');
    } else if (isBlog) {
      const seoContent = generateBlogSeoContent();
      body = injectSeoBodyContent(body, seoContent);
      log('Injected SEO body content for blog page', 'html');
    } else if (isSubmitBookshop) {
      const seoContent = generateSubmitBookshopSeoContent();
      body = injectSeoBodyContent(body, seoContent);
      log('Injected SEO body content for submit bookshop page', 'html');
    } else if (isSubmitEvent) {
      const seoContent = generateSubmitEventSeoContent();
      body = injectSeoBodyContent(body, seoContent);
      log('Injected SEO body content for submit event page', 'html');
    }
    
    // Get preloaded data script if available
    const dataScript = res.locals.dataScript || '';
    
    // Inject scripts before the closing </body> tag
    if (dataScript && body.includes('</body>')) {
      body = body.replace('</body>', `${dataScript}</body>`);
    }
    
    // Add cache headers for different page types
    setCacheHeaders(req, res);
    
    log(`Injected data into HTML for ${req.path} (originalUrl: ${req.originalUrl})`, 'html');
  } catch (error) {
    console.error('Error injecting data into HTML:', error);
  }
  
  return body;
}

/**
 * Middleware to inject preloaded data and meta tags into HTML
 * Handles res.send(), res.end(), and res.sendFile() to catch all HTML responses
 */
export function htmlInjectionMiddleware(req: Request, res: Response, next: NextFunction) {
  // Store the original methods
  const originalSend = res.send;
  const originalEnd = res.end;
  const originalSendFile = res.sendFile;
  
  // Override the send method to inject our scripts and meta tags into HTML responses
  res.send = function (body) {
    // Only process HTML responses
    if (typeof body === 'string' && body.includes('<!DOCTYPE html>')) {
      body = processHtml(body, req, res);
    }
    
    // Continue with the original send method
    return originalSend.call(this, body);
  };
  
  // Override the end method to catch Vite's HTML responses (used in dev mode)
  res.end = function (chunk?: any, encoding?: any, cb?: any) {
    // Only process HTML responses
    if (typeof chunk === 'string' && chunk.includes('<!DOCTYPE html>')) {
      chunk = processHtml(chunk, req, res);
    }
    
    // Continue with the original end method
    if (typeof encoding === 'function') {
      return originalEnd.call(this, chunk, encoding);
    }
    return originalEnd.call(this, chunk, encoding, cb);
  };
  
  // Override sendFile to intercept static file serving (used in production)
  res.sendFile = function (filePath: string, options?: any, callback?: any) {
    // Only process HTML files (index.html)
    if (filePath.includes('index.html')) {
      try {
        // Read the file
        let html = readFileSync(filePath, 'utf-8');
        
        // Process and inject meta tags
        html = processHtml(html, req, res);
        
        // Send the processed HTML
        return originalSend.call(this, html);
      } catch (error) {
        console.error('Error reading file for meta tag injection:', error);
        // Fall back to original sendFile
        return originalSendFile.call(this, filePath, options, callback);
      }
    }
    
    // For non-HTML files, use original sendFile
    return originalSendFile.call(this, filePath, options, callback);
  };
  
  next();
}

/**
 * Set appropriate cache headers based on the route type
 */
function setCacheHeaders(req: Request, res: Response): void {
  // Skip for API routes
  if (req.path.startsWith('/api/')) return;
  
  // Dynamic pages (like /bookshop/123 or /bookshop/powell-books) - short cache time
  // Use originalUrl because req.path may be "/" for static file serving
  if (req.originalUrl.match(/\/bookshop\//) || 
      req.path.match(/\/directory\/state\//) ||
      req.path.match(/\/directory\/city\//) ||
      req.path.match(/\/directory\/category\//)) {
    // Increased cache time for better performance - content doesn't change that frequently
    res.set('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600'); // 5 min browser, 10 min CDN
    return;
  }
  
  // Static pages - longer cache time with CDN support
  if (req.path === '/' || 
      req.path === '/about' || 
      req.path === '/contact' ||
      req.path === '/directory' ||
      req.path === '/events' ||
      req.path === '/blog' ||
      req.path === '/submit-bookshop' ||
      req.path === '/submit-event') {
    // Longer cache for static pages - they change infrequently
    res.set('Cache-Control', 'public, max-age=600, s-maxage=1800, stale-while-revalidate=3600'); // 10 min browser, 30 min CDN
    return;
  }
  
  // Default - short cache for safety
  res.set('Cache-Control', 'public, max-age=60, s-maxage=300');
}