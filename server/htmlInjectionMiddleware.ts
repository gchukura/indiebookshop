import { Request, Response, NextFunction } from 'express';
import { log } from './vite';

/**
 * Middleware to inject preloaded data and meta tags into HTML
 */
export function htmlInjectionMiddleware(req: Request, res: Response, next: NextFunction) {
  // Store the original res.send method
  const originalSend = res.send;
  
  // Override the send method to inject our scripts into HTML responses
  res.send = function (body) {
    // Only process HTML responses
    if (typeof body === 'string' && body.includes('<!DOCTYPE html>')) {
      try {
        // Get preloaded data script if available
        const dataScript = res.locals.dataScript || '';
        
        // Inject scripts before the closing </body> tag
        body = body.replace(
          '</body>',
          `${dataScript}</body>`
        );
        
        // Add cache headers for different page types
        setCacheHeaders(req, res);
        
        log(`Injected data into HTML for ${req.path}`, 'html');
      } catch (error) {
        console.error('Error injecting data into HTML:', error);
      }
    }
    
    // Continue with the original send method
    return originalSend.call(this, body);
  };
  
  next();
}

/**
 * Set appropriate cache headers based on the route type
 */
function setCacheHeaders(req: Request, res: Response): void {
  // Skip for API routes
  if (req.path.startsWith('/api/')) return;
  
  // Dynamic pages (like /bookshop/123) - short cache time
  if (req.path.match(/\/bookshop\/\d+/) || 
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