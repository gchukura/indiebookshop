// Serverless-compatible version of the data refresh manager

// Simple refresh manager for serverless environment
export class DataRefreshManager {
  constructor(storage, config = {}) {
    this.storage = storage;
    this.config = {
      baseInterval: parseInt(config.baseInterval || 1800000, 10), // 30 minutes
      minRefreshInterval: parseInt(config.minRefreshInterval || 300000, 10), // 5 minutes
      initialDelay: parseInt(config.initialDelay || 60000, 10), // 1 minute
      offPeakHours: config.offPeakHours || { start: 22, end: 6 }
    };
    this.lastRefreshTime = 0;
    this.refreshAttempts = 0;
    this.enabled = true;
    
    // In serverless, we don't schedule refreshes with setInterval
    // Refreshes happen on demand or when the function is invoked
  }
  
  /**
   * Manually trigger a refresh (useful for admin features)
   * Returns true if refresh was performed, false if skipped due to rate limiting
   */
  async manualRefresh() {
    if (!this.enabled) {
      console.log('Serverless: Data refresh is disabled');
      return false;
    }
    
    // Skip refresh for SupabaseStorage (real-time database doesn't need refresh)
    // Check by checking if storage has refreshData method (SupabaseStorage doesn't have it)
    if (!this.storage.refreshData || typeof this.storage.refreshData !== 'function') {
      console.log('Serverless: Skipping refresh - Supabase is real-time, no refresh needed');
      return false;
    }
    
    const now = Date.now();
    const timeSinceLastRefresh = now - this.lastRefreshTime;
    
    // Check if enough time has passed since the last refresh
    if (timeSinceLastRefresh < this.config.minRefreshInterval) {
      console.log(`Serverless: Skipping refresh, last refresh was ${timeSinceLastRefresh}ms ago (minimum interval: ${this.config.minRefreshInterval}ms)`);
      return false;
    }
    
    // Refresh the data
    try {
      console.log('Serverless: Starting manual data refresh...');
      await this.storage.refreshData();
      this.lastRefreshTime = now;
      this.refreshAttempts = 0;
      console.log('Serverless: Manual data refresh completed successfully');
      return true;
    } catch (error) {
      this.refreshAttempts++;
      console.error('Serverless: Error during manual data refresh:', error);
      return false;
    }
  }
  
  /**
   * Enable or disable the automatic refresh system
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    console.log(`Serverless: Data refresh system ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Get the current status of the refresh system
   */
  getStatus() {
    return {
      enabled: this.enabled,
      lastRefreshTime: this.lastRefreshTime,
      timeSinceLastRefresh: Date.now() - this.lastRefreshTime,
      refreshAttempts: this.refreshAttempts,
      config: this.config
    };
  }
}