// Environment configuration for Vercel
export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'production',
  USE_SAMPLE_DATA: process.env.USE_SAMPLE_DATA || 'true',
  GOOGLE_SHEETS_ID: process.env.GOOGLE_SHEETS_ID || '',
  USE_MEM_STORAGE: process.env.USE_MEM_STORAGE || 'false',
  MAPBOX_ACCESS_TOKEN: process.env.MAPBOX_ACCESS_TOKEN || '',
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || ''
};