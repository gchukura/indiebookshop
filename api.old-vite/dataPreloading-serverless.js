// Serverless-compatible version of data preloading middleware
export function dataPreloadMiddleware(req, res, next) {
  console.log('Serverless: Data preloading middleware running');
  
  // Skip preloading for API routes
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  // For now, just add a simple preloaded object to the request
  req.preloadedData = {
    isServerless: true,
    timestamp: new Date().toISOString()
  };
  
  console.log(`Serverless: Preloaded data for ${req.path}`);
  next();
}