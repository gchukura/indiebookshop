// This file serves as a bridge between Vercel's serverless environment 
// and our Express application

import express from 'express';
import { createServer } from 'http';
import { parse } from 'url';
// Import serverless-specific implementations
import { GoogleSheetsStorage } from './sheets-storage-serverless.js';
import { SupabaseStorage } from './supabase-storage-serverless.js';
import { storage } from './storage-serverless.js';
import { registerRoutes } from './routes-serverless.js';
import { dataPreloadMiddleware } from './dataPreloading-serverless.js';
import { htmlInjectionMiddleware } from './htmlInjectionMiddleware-serverless.js';

// Create our Express app
const app = express();

// Trust proxy for rate limiting behind Vercel's proxy
app.set('trust proxy', true);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Import environment configuration
import { ENV } from './env-config.js';
import { DataRefreshManager } from './dataRefresh-serverless.js';
import { registerRefreshRoutes } from './refreshRoutes-serverless.js';

// Set up environment variables from config
// Note: Don't overwrite process.env values that are already set (e.g., from Vercel)
// Only set them if they're not already present
process.env.NODE_ENV = process.env.NODE_ENV || ENV.NODE_ENV;
process.env.USE_SAMPLE_DATA = process.env.USE_SAMPLE_DATA || ENV.USE_SAMPLE_DATA;
process.env.GOOGLE_SHEETS_ID = process.env.GOOGLE_SHEETS_ID || ENV.GOOGLE_SHEETS_ID;
process.env.USE_MEM_STORAGE = process.env.USE_MEM_STORAGE || ENV.USE_MEM_STORAGE;
process.env.MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || ENV.MAPBOX_ACCESS_TOKEN;
process.env.GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || ENV.GOOGLE_PLACES_API_KEY;
// RESEND_API_KEY and RESEND_FROM_EMAIL removed - email functionality disabled
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || ENV.ADMIN_EMAIL;
// CRITICAL: Don't overwrite Supabase env vars if they're already set by Vercel
// Vercel provides these directly, so we should preserve them
process.env.SUPABASE_URL = process.env.SUPABASE_URL || ENV.SUPABASE_URL;
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ENV.SUPABASE_SERVICE_ROLE_KEY;
process.env.REFRESH_API_KEY = process.env.REFRESH_API_KEY || ENV.REFRESH_API_KEY;
process.env.REFRESH_INTERVAL = process.env.REFRESH_INTERVAL || ENV.REFRESH_INTERVAL;
process.env.MIN_REFRESH_INTERVAL = process.env.MIN_REFRESH_INTERVAL || ENV.MIN_REFRESH_INTERVAL;
process.env.DISABLE_AUTO_REFRESH = process.env.DISABLE_AUTO_REFRESH || ENV.DISABLE_AUTO_REFRESH;

// Choose which storage implementation to use
// Priority: SUPABASE > Google Sheets > In-Memory
const USE_SUPABASE = process.env.USE_SUPABASE_STORAGE === 'true' || !!process.env.SUPABASE_URL;
const USE_GOOGLE_SHEETS = !USE_SUPABASE && ENV.USE_MEM_STORAGE !== 'true';

// Setup storage
let storageImplementation;
if (USE_SUPABASE) {
  storageImplementation = new SupabaseStorage();
  console.log('Serverless: Using Supabase storage implementation');
  console.log('Serverless: Supabase URL:', process.env.SUPABASE_URL ? 'SET' : 'MISSING');
  console.log('Serverless: Supabase Service Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING');
} else if (USE_GOOGLE_SHEETS) {
  storageImplementation = new GoogleSheetsStorage();
  console.log('Serverless: Using Google Sheets storage implementation');
} else {
  storageImplementation = storage;
  console.log('Serverless: Using in-memory storage implementation');
}

// Initialize server
let server;
let isSetup = false;
let refreshManager;

async function setupServer() {
  if (!isSetup) {
    try {
      server = createServer();
      
      // Add middleware first
      app.use(dataPreloadMiddleware);
      app.use(htmlInjectionMiddleware);
      
      // Create and configure data refresh manager
      refreshManager = new DataRefreshManager(storageImplementation, {
        baseInterval: parseInt(ENV.REFRESH_INTERVAL, 10),
        minRefreshInterval: parseInt(ENV.MIN_REFRESH_INTERVAL, 10),
        initialDelay: ENV.NODE_ENV === 'production' ? 300000 : 60000,
      });
      
      // Enable or disable auto-refresh based on environment
      if (ENV.DISABLE_AUTO_REFRESH === 'true') {
        refreshManager.setEnabled(false);
        console.log('Serverless: Automatic data refresh is disabled via DISABLE_AUTO_REFRESH environment variable');
      } else {
        console.log('Serverless: Automatic data refresh is enabled');
      }
      
      // Register refresh API routes
      registerRefreshRoutes(app, refreshManager);
      
      // Register API routes
      await registerRoutes(app, storageImplementation);
      
      // Error handling
      app.use((err, _req, res, _next) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        console.error('Serverless Error:', err);
        res.status(status).json({ message });
      });
      
      // Serve static files for production
      if (process.env.NODE_ENV === 'production') {
        // In Vercel serverless functions, we don't serve static files directly
        // Instead, we rely on Vercel's file routing
        
        // Handle client-side routing for non-API routes
        app.get('*', async (req, res) => {
          if (!req.path.startsWith('/api/')) {
            // If this is the homepage, try to use static-pages function
            if (req.path === '/' || req.path === '') {
              try {
                const staticPagesHandler = (await import('./static-pages.js')).default;
                return staticPagesHandler(req, res);
              } catch (error) {
                console.error('[Serverless] Error importing static-pages for homepage:', error);
                // Fall through to default HTML
              }
            }
            
            // Properly escape the Mapbox token to prevent XSS/injection attacks
            const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN || '';
            const escapedToken = JSON.stringify(mapboxToken);
            
            res.status(200).send(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>IndiebookShop.com - Connecting Book Lovers with Local Bookshops</title>
                  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1">
                  <script>
                    window.ENV = {
                      MAPBOX_ACCESS_TOKEN: ${escapedToken},
                      IS_SERVERLESS: true
                    };
                  </script>
                </head>
                <body>
                  <div id="root">
                    <p>Loading IndiebookShop.com...</p>
                    <p>If this message persists, please ensure JavaScript is enabled in your browser.</p>
                  </div>
                </body>
              </html>
            `);
          } else {
            res.status(404).json({ error: 'API endpoint not found' });
          }
        });
      }
    } catch (error) {
      console.error('Serverless server setup error:', error);
    }
    
    isSetup = true;
  }
  
  return { app, server };
}

// Export the serverless function handler
export default async function handler(req, res) {
  const { app } = await setupServer();
  
  // Process the request
  return new Promise((resolve, reject) => {
    app(req, res, (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}