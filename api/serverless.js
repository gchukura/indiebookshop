// This file serves as a bridge between Vercel's serverless environment 
// and our Express application

import express from 'express';
import { createServer } from 'http';
import { parse } from 'url';
// Import serverless-specific implementations
import { GoogleSheetsStorage } from './sheets-storage-serverless.js';
import { storage } from './storage-serverless.js';
import { registerRoutes } from './routes-serverless.js';
import { dataPreloadMiddleware } from './dataPreloading-serverless.js';
import { htmlInjectionMiddleware } from './htmlInjectionMiddleware-serverless.js';

// Create our Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Import environment configuration
import { ENV } from './env-config.js';
import { DataRefreshManager } from './dataRefresh-serverless.js';
import { registerRefreshRoutes } from './refreshRoutes-serverless.js';

// Set up environment variables from config
process.env.NODE_ENV = ENV.NODE_ENV;
process.env.USE_SAMPLE_DATA = ENV.USE_SAMPLE_DATA;
process.env.GOOGLE_SHEETS_ID = ENV.GOOGLE_SHEETS_ID;
process.env.USE_MEM_STORAGE = ENV.USE_MEM_STORAGE;
process.env.MAPBOX_ACCESS_TOKEN = ENV.MAPBOX_ACCESS_TOKEN;
process.env.SENDGRID_API_KEY = ENV.SENDGRID_API_KEY;
process.env.REFRESH_API_KEY = ENV.REFRESH_API_KEY;
process.env.REFRESH_INTERVAL = ENV.REFRESH_INTERVAL;
process.env.MIN_REFRESH_INTERVAL = ENV.MIN_REFRESH_INTERVAL;
process.env.DISABLE_AUTO_REFRESH = ENV.DISABLE_AUTO_REFRESH;

// Choose which storage implementation to use
const USE_GOOGLE_SHEETS = ENV.USE_MEM_STORAGE !== 'true';

// Setup storage
const storageImplementation = USE_GOOGLE_SHEETS ? new GoogleSheetsStorage() : storage;

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
        app.get('*', (req, res) => {
          if (!req.path.startsWith('/api/')) {
            res.status(200).send(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>IndiebookShop.com - Connecting Book Lovers with Local Bookshops</title>
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <script>
                    window.ENV = {
                      MAPBOX_ACCESS_TOKEN: "${process.env.MAPBOX_ACCESS_TOKEN || ''}",
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