// Serverless-compatible version of HTML injection middleware
export function htmlInjectionMiddleware(req, res, next) {
  // Store the original send function
  const originalSend = res.send;
  
  // Override the send function
  res.send = function(body) {
    // Only process HTML responses
    if (typeof body === 'string' && body.includes('<!DOCTYPE html>')) {
      try {
        // Extract preloaded data from request
        const preloadedData = req.preloadedData || {};
        
        // Create a script to inject preloaded data
        const dataScript = `
          <script>
            window.__PRELOADED_STATE__ = ${JSON.stringify(preloadedData)};
            window.ENV = {
              MAPBOX_ACCESS_TOKEN: "${process.env.MAPBOX_ACCESS_TOKEN || ''}",
              IS_SERVERLESS: true
            };
          </script>
        `;
        
        // Inject the script right before the closing head tag
        body = body.replace('</head>', `${dataScript}</head>`);
      } catch (error) {
        console.error('Error injecting HTML:', error);
      }
    }
    
    // Call the original send with the modified body
    return originalSend.call(this, body);
  };
  
  next();
}