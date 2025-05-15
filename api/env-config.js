// Environment configuration for Vercel
export const ENV = {
  // Core environment settings
  NODE_ENV: process.env.NODE_ENV || 'production',
  USE_SAMPLE_DATA: process.env.USE_SAMPLE_DATA || 'true',
  GOOGLE_SHEETS_ID: process.env.GOOGLE_SHEETS_ID || '',
  USE_MEM_STORAGE: process.env.USE_MEM_STORAGE || 'false',
  
  // API keys
  MAPBOX_ACCESS_TOKEN: process.env.MAPBOX_ACCESS_TOKEN || '',
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || '',
  
  // Data refresh configuration
  REFRESH_API_KEY: process.env.REFRESH_API_KEY || 'indiebookshop-refresh-key',
  REFRESH_INTERVAL: process.env.REFRESH_INTERVAL || '1800000', // 30 minutes
  MIN_REFRESH_INTERVAL: process.env.MIN_REFRESH_INTERVAL || '900000', // 15 minutes
  DISABLE_AUTO_REFRESH: process.env.DISABLE_AUTO_REFRESH || 'false'
};