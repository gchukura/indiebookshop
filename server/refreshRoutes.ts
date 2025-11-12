/**
 * API routes for data refresh functionality
 */

import type { Express } from "express";
import { DataRefreshManager } from "./dataRefresh";

// Refresh API key for basic security
// In production, use a proper authentication system
const API_KEY_HEADER = 'X-Refresh-API-Key';

export function registerRefreshRoutes(app: Express, refreshManager: DataRefreshManager): void {
  /**
   * Get current refresh status
   * GET /api/admin/refresh/status
   */
  app.get('/api/admin/refresh/status', validateApiKey, (req, res) => {
    const status = refreshManager.getStatus();
    res.json({
      success: true,
      status
    });
  });

  /**
   * Manually trigger a data refresh
   * POST /api/admin/refresh
   */
  app.post('/api/admin/refresh', validateApiKey, async (req, res) => {
    try {
      const result = await refreshManager.manualRefresh();
      
      if (result) {
        res.json({
          success: true,
          message: 'Data refresh completed successfully'
        });
      } else {
        res.status(429).json({
          success: false,
          message: 'Refresh skipped: too soon since last refresh'
        });
      }
    } catch (error) {
      console.error('Error in manual refresh route:', error);
      res.status(500).json({
        success: false,
        message: 'Error during data refresh',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * Enable/disable automatic refresh
   * POST /api/admin/refresh/config
   */
  app.post('/api/admin/refresh/config', validateApiKey, (req, res) => {
    try {
      // Validate request
      const { enabled } = req.body;
      
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'Invalid request: "enabled" must be a boolean'
        });
      }
      
      // Update refresh manager state
      refreshManager.setEnabled(enabled);
      
      // Return success
      res.json({
        success: true,
        message: `Automatic refresh ${enabled ? 'enabled' : 'disabled'}`,
        status: refreshManager.getStatus()
      });
    } catch (error) {
      console.error('Error in refresh config route:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating refresh configuration',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  /**
   * Middleware to validate the API key
   */
  function validateApiKey(req: any, res: any, next: any) {
    const apiKey = req.get(API_KEY_HEADER);
    
    // Get the API key from environment - fail if not set
    const validApiKey = process.env.REFRESH_API_KEY;
    
    if (!validApiKey) {
      console.error('REFRESH_API_KEY environment variable is required but not set');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error: REFRESH_API_KEY not set'
      });
    }
    
    if (!apiKey || apiKey !== validApiKey) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or missing API key'
      });
    }
    
    next();
  }
}