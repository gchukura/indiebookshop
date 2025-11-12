// Load environment variables from .env file (for local development)
import 'dotenv/config';

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { GoogleSheetsStorage } from './sheets-storage';
import { storage } from './storage';
import { dataPreloadMiddleware } from './dataPreloading';
import { htmlInjectionMiddleware } from './htmlInjectionMiddleware';
import { DataRefreshManager } from './dataRefresh';
import { registerRefreshRoutes } from './refreshRoutes';
import { redirectMiddleware } from './redirectMiddleware';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Choose which storage implementation to use
// Use Google Sheets by default, unless USE_MEM_STORAGE env var is set to 'true'
// Or USE_SAMPLE_DATA is 'true' to use the sample data in GoogleSheetsStorage
const USE_GOOGLE_SHEETS = process.env.USE_MEM_STORAGE !== 'true';

// USE_SAMPLE_DATA controls whether to use sample data or try to connect to Google Sheets
// You can override this by setting the USE_SAMPLE_DATA environment variable
// Default to false to load from Google Sheets (set to 'true' only for testing)
process.env.USE_SAMPLE_DATA = process.env.USE_SAMPLE_DATA || 'false';

// GOOGLE_SHEETS_ID environment variable can be used to specify the spreadsheet ID
// If not provided, the default ID in google-sheets.ts will be used
if (process.env.GOOGLE_SHEETS_ID) {
  console.log(`Using Google Sheets ID from environment: ${process.env.GOOGLE_SHEETS_ID}`);
} else {
  console.log('Using default Google Sheets ID (set GOOGLE_SHEETS_ID env var to override)');
}

const storageImplementation = USE_GOOGLE_SHEETS ? new GoogleSheetsStorage() : storage;

// Create data refresh manager with optimal settings
const refreshManager = new DataRefreshManager(storageImplementation, {
  // Use environment variables if provided, otherwise use sensible defaults
  baseInterval: parseInt(process.env.REFRESH_INTERVAL || '1800000', 10), // 30 minutes by default
  minRefreshInterval: parseInt(process.env.MIN_REFRESH_INTERVAL || '900000', 10), // 15 minutes by default
  initialDelay: process.env.NODE_ENV === 'production' ? 300000 : 60000, // 5 minutes in prod, 1 minute in dev
});

// Enable or disable refresh based on environment
if (process.env.DISABLE_AUTO_REFRESH === 'true') {
  refreshManager.setEnabled(false);
  log('Automatic data refresh is disabled via DISABLE_AUTO_REFRESH environment variable');
}

(async () => {
  const server = await registerRoutes(app, storageImplementation);
  
  // Register refresh routes
  registerRefreshRoutes(app, refreshManager);
  
  log(`Using ${USE_GOOGLE_SHEETS ? 'Google Sheets' : 'in-memory'} storage implementation`);
  log('Data refresh system initialized - data will automatically update from Google Sheets');

  // Add redirectMiddleware before other middlewares
  // This ensures redirects happen before rendering the page
  app.use(redirectMiddleware);

  // Add SSR middlewares before Vite setup
  // They only run for page requests, not API requests
  app.use(dataPreloadMiddleware);   // Preload data on the server
  app.use(htmlInjectionMiddleware); // Inject data and meta tags into HTML

  // Error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve the app on port 3000 (changed from 5000 to avoid ControlCenter conflict)
  // this serves both the API and the client.
  const port = 3000;
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
