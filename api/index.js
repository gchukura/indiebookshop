import express from 'express';
import { registerRoutes } from '../server/routes.js';
import { GoogleSheetsStorage } from '../server/sheets-storage.js';
import { storage } from '../server/storage.js';
import { dataPreloadMiddleware } from '../server/dataPreloading.js';
import { htmlInjectionMiddleware } from '../server/htmlInjectionMiddleware.js';

// Initialize Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
  });

  next();
});

// Choose storage implementation
const USE_GOOGLE_SHEETS = process.env.USE_MEM_STORAGE !== 'true';
process.env.USE_SAMPLE_DATA = process.env.USE_SAMPLE_DATA || 'true';

const storageImplementation = USE_GOOGLE_SHEETS ? new GoogleSheetsStorage() : storage;

// Setup and start the server
let serverInstance;

const setupServer = async () => {
  if (!serverInstance) {
    serverInstance = await registerRoutes(app, storageImplementation);
    
    // Add SSR middlewares
    app.use(dataPreloadMiddleware);
    app.use(htmlInjectionMiddleware);
    
    // Error handling middleware
    app.use((err, _req, res, _next) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });
    
    // Serve static files from the 'dist/public' directory
    app.use(express.static('dist/public'));
    
    // Fallback route for client-side routing
    app.get('*', (req, res) => {
      res.sendFile('dist/public/index.html', { root: '.' });
    });
  }
  
  return app;
};

// Export the serverless function for Vercel
export default async function handler(req, res) {
  const app = await setupServer();
  return app(req, res);
}