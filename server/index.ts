// Load environment variables from .env file (for local development)
import 'dotenv/config';

import express, { type Request, Response, NextFunction } from "express";
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { GoogleSheetsStorage } from './sheets-storage';
import { storage } from './storage';
import { SupabaseStorage } from './supabase-storage';
import { createDataPreloadMiddleware } from './dataPreloading';
import { htmlInjectionMiddleware } from './htmlInjectionMiddleware';
import { DataRefreshManager } from './dataRefresh';
import { registerRefreshRoutes } from './refreshRoutes';
import { redirectMiddleware } from './redirectMiddleware';
import { validateAndLogEnvironment } from './env-validation';

// Validate environment variables on startup
validateAndLogEnvironment();

const app = express();

// Enable compression for all responses (reduces JSON payload sizes significantly)
app.use(compression({
  filter: (req: Request, res: Response) => {
    // Compress all responses except if explicitly disabled
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Balance between compression ratio and CPU usage
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Rate limiting configuration
// General API rate limiter - 100 requests per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Strict rate limiter for submission endpoints - 5 requests per 15 minutes per IP
const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many submissions from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiter for config endpoint (exposes sensitive tokens)
// 20 requests per 15 minutes per IP - enough for normal usage, prevents scraping
const configLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: 'Too many requests to config endpoint, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting in development for easier testing
    return process.env.NODE_ENV === 'development';
  },
});

// Apply general rate limiting to all API routes
app.use('/api', generalLimiter);

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
// Priority: SUPABASE (default) > Google Sheets (fallback) > In-Memory
// Supabase is now the default for better performance
const USE_SUPABASE = process.env.USE_GOOGLE_SHEETS !== 'true' && 
  (process.env.USE_SUPABASE_STORAGE === 'true' || !!process.env.SUPABASE_URL);
const USE_GOOGLE_SHEETS = process.env.USE_GOOGLE_SHEETS === 'true' && !USE_SUPABASE;

// USE_SAMPLE_DATA controls whether to use sample data
// You can override this by setting the USE_SAMPLE_DATA environment variable
// Default to false (set to 'true' only for testing)
process.env.USE_SAMPLE_DATA = process.env.USE_SAMPLE_DATA || 'false';

let storageImplementation: IStorage;

if (USE_SUPABASE) {
  storageImplementation = new SupabaseStorage();
  log('Using Supabase storage implementation');
} else if (USE_GOOGLE_SHEETS) {
  // GOOGLE_SHEETS_ID environment variable can be used to specify the spreadsheet ID
  // If not provided, the default ID in google-sheets.ts will be used
  if (process.env.GOOGLE_SHEETS_ID) {
    console.log(`Using Google Sheets ID from environment: ${process.env.GOOGLE_SHEETS_ID}`);
  } else {
    console.log('Using default Google Sheets ID (set GOOGLE_SHEETS_ID env var to override)');
  }
  storageImplementation = new GoogleSheetsStorage();
  log('Using Google Sheets storage implementation');
} else {
  storageImplementation = storage;
  log('Using in-memory storage implementation');
}

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
  
  // Apply stricter rate limiting to config endpoint (exposes sensitive tokens)
  // This must be applied after routes are registered
  app.use('/api/config', configLimiter);
  
  // Register refresh routes
  registerRefreshRoutes(app, refreshManager);
  
  log(`Using ${USE_SUPABASE ? 'Supabase' : USE_GOOGLE_SHEETS ? 'Google Sheets' : 'in-memory'} storage implementation`);
  if (USE_SUPABASE) {
    log('Data refresh system initialized - Supabase is real-time, no periodic refresh needed');
  } else {
    log('Data refresh system initialized - data will automatically update from Google Sheets');
  }

  // Add redirectMiddleware before other middlewares
  // This ensures redirects happen before rendering the page
  app.use(redirectMiddleware);

  // Add SSR middlewares before Vite setup
  // They only run for page requests, not API requests
  // Create data preload middleware with the configured storage implementation
  const dataPreloadMiddleware = createDataPreloadMiddleware(storageImplementation);
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
  // Allow PORT environment variable to override default
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
