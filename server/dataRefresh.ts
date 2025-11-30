/**
 * Smart Data Refresh System for IndiebookShop.com
 * 
 * This module implements an intelligent data refresh strategy that:
 * 1. Minimizes Google Sheets API costs by using adaptive refresh intervals
 * 2. Maintains performance by avoiding excess refreshes during high traffic
 * 3. Ensures user experience by keeping data reasonably up-to-date
 * 4. Provides manual refresh capability for immediate updates
 * 
 * Note: SupabaseStorage doesn't need refresh (real-time database)
 */

import { IStorage } from './storage';
import { SupabaseStorage } from './supabase-storage';

// Refresh configuration with sensible defaults
interface RefreshConfig {
  // Base interval between refresh attempts (in milliseconds)
  baseInterval: number;
  
  // Minimum time between actual API calls (to prevent quota issues)
  minRefreshInterval: number;
  
  // Maximum time between refreshes (to ensure data eventually updates)
  maxRefreshInterval: number;
  
  // Delay before first refresh on startup (allows system to stabilize)
  initialDelay: number;
  
  // Hours considered "off-peak" for more aggressive refreshing (24-hour format)
  offPeakHours: {
    start: number; // Hour to start off-peak (e.g., 22 for 10 PM)
    end: number;   // Hour to end off-peak (e.g., 6 for 6 AM)
  };
}

// Default config with balanced settings
const DEFAULT_CONFIG: RefreshConfig = {
  baseInterval: 30 * 60 * 1000,     // 30 minutes
  minRefreshInterval: 15 * 60 * 1000, // 15 minutes (prevents excessive API calls)
  maxRefreshInterval: 24 * 60 * 60 * 1000, // 24 hours (guarantees at least daily updates)
  initialDelay: 5 * 60 * 1000,      // 5 minutes after startup
  offPeakHours: {
    start: 22, // 10 PM
    end: 6     // 6 AM
  }
};

export class DataRefreshManager {
  private storage: IStorage;
  private config: RefreshConfig;
  private lastRefreshTime: number = 0;
  private refreshTimer: NodeJS.Timeout | null = null;
  private refreshAttempts: number = 0;
  private enabled: boolean = true;
  
  constructor(storage: IStorage, config: Partial<RefreshConfig> = {}) {
    this.storage = storage;
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Convert this.config.lastRefreshTime to current time
    this.lastRefreshTime = Date.now();
    
    // Schedule initial refresh after startup delay
    setTimeout(() => this.scheduleNextRefresh(), this.config.initialDelay);
  }
  
  /**
   * Schedule the next refresh based on adaptive timing
   */
  private scheduleNextRefresh(): void {
    if (!this.enabled) return;
    
    // Calculate time until next refresh
    const interval = this.calculateNextRefreshInterval();
    
    // Schedule the refresh
    this.refreshTimer = setTimeout(() => this.performRefresh(), interval);
    
    console.log(`Next data refresh scheduled in ${Math.round(interval / 60000)} minutes`);
  }
  
  /**
   * Calculate the next refresh interval using an adaptive algorithm
   */
  private calculateNextRefreshInterval(): number {
    const now = new Date();
    const currentHour = now.getHours();
    const timeSinceLastRefresh = Date.now() - this.lastRefreshTime;
    
    // Check if we're in off-peak hours
    const isOffPeak = (currentHour >= this.config.offPeakHours.start || 
                        currentHour < this.config.offPeakHours.end);
    
    // If it's been too long since last refresh, use minimum interval
    if (timeSinceLastRefresh > this.config.maxRefreshInterval) {
      return this.config.minRefreshInterval;
    }
    
    // During off-peak hours, refresh more frequently
    if (isOffPeak) {
      return this.config.minRefreshInterval;
    }
    
    // Use standard interval with exponential backoff if there have been errors
    let interval = this.config.baseInterval;
    
    // Apply exponential backoff if there have been recent failures
    if (this.refreshAttempts > 1) {
      // Exponential backoff with a maximum (won't exceed maxRefreshInterval)
      const backoff = Math.min(
        this.config.baseInterval * Math.pow(1.5, this.refreshAttempts - 1),
        this.config.maxRefreshInterval
      );
      interval = backoff;
    }
    
    return interval;
  }
  
  /**
   * Perform the actual data refresh
   */
  private async performRefresh(): Promise<void> {
    try {
      // Skip refresh for SupabaseStorage (real-time database doesn't need periodic refresh)
      if (this.storage instanceof SupabaseStorage) {
        console.log('Skipping refresh - Supabase is real-time, no periodic refresh needed');
        return;
      }
      
      console.log('Starting automatic data refresh...');
      
      // Check if enough time has passed (prevents accidental rapid refreshes)
      const timeSinceLastRefresh = Date.now() - this.lastRefreshTime;
      if (timeSinceLastRefresh < this.config.minRefreshInterval) {
        console.log('Skipping refresh - minimum interval not reached');
        return;
      }
      
      // Perform the actual refresh
      if ('refreshData' in this.storage && typeof this.storage.refreshData === 'function') {
        await (this.storage as any).refreshData();
      }
      
      // Update state after successful refresh
      this.lastRefreshTime = Date.now();
      this.refreshAttempts = 0;
      
      console.log('Automatic data refresh completed successfully');
    } catch (error) {
      // Track failed attempts
      this.refreshAttempts++;
      
      console.error('Error during automatic data refresh:', error);
    } finally {
      // Schedule next refresh regardless of success/failure
      this.scheduleNextRefresh();
    }
  }
  
  /**
   * Manually trigger a refresh (useful for admin features)
   * Returns true if refresh was performed, false if skipped due to rate limiting
   */
  public async manualRefresh(): Promise<boolean> {
    // Skip refresh for SupabaseStorage (real-time database doesn't need refresh)
    if (this.storage instanceof SupabaseStorage) {
      console.log('Manual refresh skipped - Supabase is real-time, no refresh needed');
      return false;
    }
    
    // Check if we're trying to refresh too frequently
    const timeSinceLastRefresh = Date.now() - this.lastRefreshTime;
    
    // For manual refreshes, use a shorter minimum interval
    const manualMinInterval = 5 * 60 * 1000; // 5 minutes
    
    if (timeSinceLastRefresh < manualMinInterval) {
      console.log(`Manual refresh skipped - last refresh was ${Math.round(timeSinceLastRefresh / 1000)} seconds ago`);
      return false;
    }
    
    try {
      // Clear any scheduled refresh
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
        this.refreshTimer = null;
      }
      
      // Perform the refresh
      console.log('Starting manual data refresh...');
      if ('refreshData' in this.storage && typeof this.storage.refreshData === 'function') {
        await (this.storage as any).refreshData();
      }
      
      // Update state
      this.lastRefreshTime = Date.now();
      this.refreshAttempts = 0;
      
      console.log('Manual data refresh completed successfully');
      
      // Schedule next automatic refresh
      this.scheduleNextRefresh();
      
      return true;
    } catch (error) {
      console.error('Error during manual data refresh:', error);
      
      // Increase attempt counter but not as much as for automatic refreshes
      this.refreshAttempts = Math.min(this.refreshAttempts + 1, 2);
      
      // Reschedule next refresh
      this.scheduleNextRefresh();
      
      return false;
    }
  }
  
  /**
   * Enable or disable the automatic refresh system
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    
    if (!enabled && this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
      console.log('Automatic data refresh disabled');
    } else if (enabled && !this.refreshTimer) {
      console.log('Automatic data refresh enabled');
      this.scheduleNextRefresh();
    }
  }
  
  /**
   * Get the current status of the refresh system
   */
  public getStatus(): any {
    return {
      enabled: this.enabled,
      lastRefreshTime: new Date(this.lastRefreshTime).toISOString(),
      nextRefreshIn: this.refreshTimer 
        ? Math.round((this.lastRefreshTime + this.calculateNextRefreshInterval() - Date.now()) / 1000)
        : null,
      refreshAttempts: this.refreshAttempts,
      config: {
        baseInterval: `${this.config.baseInterval / 60000} minutes`,
        minRefreshInterval: `${this.config.minRefreshInterval / 60000} minutes`,
        maxRefreshInterval: `${this.config.maxRefreshInterval / 3600000} hours`,
        offPeakHours: `${this.config.offPeakHours.start}:00-${this.config.offPeakHours.end}:00`
      }
    };
  }
}