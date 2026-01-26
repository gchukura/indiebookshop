// Serverless-compatible refresh routes

export function registerRefreshRoutes(app, refreshManager) {
  /**
   * Get current refresh status
   * GET /api/admin/refresh/status
   */
  app.get('/api/admin/refresh/status', validateApiKey, (req, res) => {
    console.log('Serverless: Getting refresh status');
    const status = refreshManager.getStatus();
    status.serverless = true;
    status.environment = process.env.NODE_ENV || 'production';
    
    return res.json({
      success: true,
      status
    });
  });

  /**
   * Manually trigger a data refresh
   * POST /api/admin/refresh
   */
  app.post('/api/admin/refresh', validateApiKey, async (req, res) => {
    console.log('Serverless: Manual refresh requested');
    try {
      const refreshed = await refreshManager.manualRefresh();
      
      return res.json({
        success: true,
        refreshed,
        message: refreshed 
          ? 'Data refreshed successfully' 
          : 'Refresh skipped (rate limited)'
      });
    } catch (error) {
      console.error('Serverless: Error during manual refresh:', error);
      return res.status(500).json({
        success: false,
        message: 'Error refreshing data',
        error: error.message
      });
    }
  });

  /**
   * Enable/disable automatic refresh
   * POST /api/admin/refresh/config
   */
  app.post('/api/admin/refresh/config', validateApiKey, (req, res) => {
    if (req.body.enabled !== undefined) {
      console.log(`Serverless: Setting refresh enabled: ${req.body.enabled}`);
      refreshManager.setEnabled(!!req.body.enabled);
    }
    
    return res.json({
      success: true,
      status: refreshManager.getStatus()
    });
  });

  /**
   * Middleware to validate the API key
   */
  function validateApiKey(req, res, next) {
    const apiKey = req.headers['x-refresh-api-key'];
    
    if (!process.env.REFRESH_API_KEY) {
      console.warn('Serverless: REFRESH_API_KEY not set in environment variables');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error: REFRESH_API_KEY not set'
      });
    }
    
    if (apiKey !== process.env.REFRESH_API_KEY) {
      console.warn('Serverless: Invalid API key used for refresh endpoint');
      return res.status(403).json({
        success: false,
        message: 'Invalid or missing API key'
      });
    }
    
    next();
  }
}