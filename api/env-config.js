// Environment configuration for serverless functions
export const ENV = {
  // Default to production mode for Vercel deployment
  NODE_ENV: process.env.NODE_ENV || 'production',
  
  // Google Sheets configuration - use environment variables
  USE_SAMPLE_DATA: process.env.USE_SAMPLE_DATA || 'false',
  GOOGLE_SHEETS_ID: process.env.GOOGLE_SHEETS_ID || '',
  USE_MEM_STORAGE: process.env.USE_MEM_STORAGE || 'false',
  
  // Mapbox API key
  MAPBOX_ACCESS_TOKEN: process.env.MAPBOX_ACCESS_TOKEN || '',
  
  // Google Places API key
  GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY || '',
  
  // SendGrid for email notifications
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || '',
  SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL || 'noreply@indiebookshop.com',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@indiebookshop.com',
  
  // Supabase configuration
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  
  // Data refresh configuration
  REFRESH_API_KEY: process.env.REFRESH_API_KEY || '',
  REFRESH_INTERVAL: process.env.REFRESH_INTERVAL || '1800000', // 30 minutes
  MIN_REFRESH_INTERVAL: process.env.MIN_REFRESH_INTERVAL || '300000', // 5 minutes
  DISABLE_AUTO_REFRESH: process.env.DISABLE_AUTO_REFRESH || 'false',
  
  // Google Service Account credentials will be loaded directly from 
  // process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS in the googleSheetsService
};