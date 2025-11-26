import { Request, Response, NextFunction } from 'express';
import { log } from './vite';
import { generateBookshopMetaTags } from './metaTagGenerator';
import { readFileSync } from 'fs';

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
    res.set('Cache-Control', 'public, max-age=60'); // 1 minute
    return;
  }
  
  // Static pages - longer cache time
  if (req.path === '/' || 
      req.path === '/about' || 
      req.path === '/contact' ||
      req.path === '/directory') {
    res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
    return;
  }
  
  // Default - no cache for safety
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
}