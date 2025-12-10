import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, IStorage } from "./storage";
import { 
  bookstoreFiltersSchema,
  addToFavoritesSchema,
  insertUserSchema,
  insertBookstoreSchema
} from "@shared/schema";
import { sendBookstoreSubmissionNotification, sendContactFormEmail } from "./email";
import { supabase } from "./supabase";
import { generateSitemap } from "./sitemap";
import { z } from "zod";

export async function registerRoutes(app: Express, storageImpl: IStorage = storage): Promise<Server> {
  // IMPORTANT: The order of routes matter. More specific routes should come first.
  
  // Google Places Photo Proxy - MUST be registered first to avoid being caught by other routes
  app.get("/api/place-photo", async (req, res) => {
    console.log('[Place Photo] Request received:', { 
      photo_reference: req.query.photo_reference?.substring(0, 50) + '...',
      maxwidth: req.query.maxwidth 
    });

    const { photo_reference, maxwidth = '400' } = req.query;

    // Validate photo_reference
    if (!photo_reference || typeof photo_reference !== 'string') {
      console.error('[Place Photo] Missing photo_reference');
      return res.status(400).json({ error: 'photo_reference parameter is required' });
    }

    // Validate maxwidth
    const maxWidthNum = parseInt(maxwidth as string, 10);
    if (isNaN(maxWidthNum) || maxWidthNum < 1 || maxWidthNum > 1600) {
      console.error('[Place Photo] Invalid maxwidth:', maxwidth);
      return res.status(400).json({ error: 'maxwidth must be between 1 and 1600' });
    }

    const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

    if (!GOOGLE_PLACES_API_KEY) {
      console.error('[Place Photo] GOOGLE_PLACES_API_KEY environment variable is not set');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
      // Construct Google Places Photo API URL
      const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?` +
        `maxwidth=${maxWidthNum}` +
        `&photo_reference=${encodeURIComponent(photo_reference)}` +
        `&key=${GOOGLE_PLACES_API_KEY}`;

      console.log('[Place Photo] Fetching from Google:', photoUrl.substring(0, 100) + '...');

      // Fetch the photo from Google
      const response = await fetch(photoUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'IndieBookShop/1.0'
        }
      });

      console.log('[Place Photo] Google response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Place Photo] Google Places Photo API returned status ${response.status}:`, errorText.substring(0, 200));
        return res.status(response.status).json({ 
          error: 'Failed to fetch photo from Google Places API',
          details: response.status === 403 ? 'API key may be invalid or missing required permissions' : 'Unknown error'
        });
      }

      // Get the image buffer
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Get content type from response (default to jpeg)
      const contentType = response.headers.get('content-type') || 'image/jpeg';

      console.log('[Place Photo] Successfully fetched photo:', { 
        size: buffer.length, 
        contentType 
      });

      // Set appropriate headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // Cache for 1 year
      res.setHeader('Content-Length', buffer.length.toString());

      // Send the image
      res.send(buffer);
    } catch (error) {
      console.error('[Place Photo] Error fetching Google Places photo:', error);
      if (error instanceof Error) {
        console.error('[Place Photo] Error details:', error.message, error.stack);
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Get filtered bookstores - must come before bookstores/:id
  app.get("/api/bookstores/filter", async (req, res) => {
    try {
      // Handle single feature ID or comma-separated list
      let featureIds = undefined;
      if (req.query.features) {
        if (typeof req.query.features === 'string') {
          featureIds = req.query.features.split(',').map(Number).filter(n => !isNaN(n));
        } else if (Array.isArray(req.query.features)) {
          featureIds = (req.query.features as string[]).map(Number).filter(n => !isNaN(n));
        }
      }

      // Get the state filter
      let state = undefined;
      if (req.query.state && typeof req.query.state === 'string' && req.query.state !== 'all') {
        state = req.query.state;
        
        // Handle case sensitivity for state abbreviations (e.g., "ca" -> "CA")
        if (state.length === 2) {
          state = state.toUpperCase();
        }
        // Convert state name to abbreviation if needed (longer than 2 chars)
        else if (state.length > 2) {
          // Import would create circular dependency, so hardcode a simple mapping
          const stateMap: {[key: string]: string} = {
            'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
            'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
            'district of columbia': 'DC', 'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI',
            'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
            'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
            'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
            'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
            'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
            'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
            'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
            'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
            'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
            'wisconsin': 'WI', 'wyoming': 'WY',
            'british columbia': 'BC', 'ontario': 'ON', 'quebec': 'QC', 'alberta': 'AB',
            'manitoba': 'MB', 'nova scotia': 'NS', 'new brunswick': 'NB', 'saskatchewan': 'SK'
          };
          
          const abbr = stateMap[state.toLowerCase()];
          if (abbr) {
            state = abbr;
            console.log(`Converted state name "${req.query.state}" to abbreviation "${state}"`);
          }
        }
      }
      
      // Get the city filter - not used in current UI but kept for API compatibility
      let city = undefined;
      if (req.query.city && typeof req.query.city === 'string' && req.query.city !== 'all') {
        city = req.query.city;
      }
      
      // Get the county filter
      let county = undefined;
      if (req.query.county && typeof req.query.county === 'string' && req.query.county !== 'all') {
        county = req.query.county;
        console.log(`Filter request includes county: ${county}`);
      }
      
      // Parse and validate filters - note: county is not yet in schema, so pass separately
      const validatedFilters = bookstoreFiltersSchema.parse({
        state: state,
        city: city,
        features: featureIds
      });
      
      const filterStartTime = Date.now();
      const bookstores = await storageImpl.getFilteredBookstores({
        state: validatedFilters.state,
        city: validatedFilters.city,
        county: county,
        featureIds: validatedFilters.features
      });
      const filterDuration = Date.now() - filterStartTime;
      
      const filters = [];
      if (validatedFilters.state) filters.push(`state=${validatedFilters.state}`);
      if (validatedFilters.city) filters.push(`city=${validatedFilters.city}`);
      if (county) filters.push(`county=${county}`);
      if (validatedFilters.features?.length) filters.push(`features=${validatedFilters.features.join(',')}`);
      
      console.log(`[PERF] GET /api/bookstores/filter (${filters.join(', ') || 'none'}): ${bookstores.length} bookstores in ${filterDuration}ms`);
      
      res.json(bookstores);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid filter parameters", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to fetch filtered bookstores" });
    }
  });
  
  // Get all bookstores
  app.get("/api/bookstores", async (req, res) => {
    const startTime = Date.now();
    try {
      const bookstores = await storageImpl.getBookstores();
      const duration = Date.now() - startTime;
      console.log(`[PERF] GET /api/bookstores: ${bookstores.length} bookstores in ${duration}ms`);
      res.json(bookstores);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[PERF] GET /api/bookstores: ERROR after ${duration}ms`, error);
      res.status(500).json({ message: "Failed to fetch bookstores" });
    }
  });

  // Get a specific bookstore by slug (for SEO-friendly URLs)
  // IMPORTANT: This must come BEFORE the :id route to prevent conflict
  app.get("/api/bookstores/by-slug/:slug", async (req, res) => {
    try {
      const slug = req.params.slug;
      console.log(`Looking up bookstore with slug: ${slug}`);
      
      const bookstore = await storageImpl.getBookstoreBySlug(slug);
      if (!bookstore) {
        console.log(`No bookstore found with slug: ${slug}`);
        return res.status(404).json({ message: "Bookstore not found" });
      }
      
      res.json(bookstore);
    } catch (error) {
      console.error('Error fetching bookstore by slug:', error);
      res.status(500).json({ message: "Failed to fetch bookstore by slug" });
    }
  });
  
  // Get a specific bookstore by ID
  app.get("/api/bookstores/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid bookstore ID" });
      }
      
      const bookstore = await storageImpl.getBookstore(id);
      if (!bookstore) {
        return res.status(404).json({ message: "Bookstore not found" });
      }
      
      res.json(bookstore);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookstore" });
    }
  });

  // Get environment configuration (API keys, etc.)
  // Get bookstores by city-state combination (SEO-friendly URLs)
  app.get("/api/bookstores/city-state/:cityState", async (req, res) => {
    try {
      const cityStateCombined = req.params.cityState;
      const parts = cityStateCombined.split('-');
      
      if (parts.length < 2) {
        return res.status(400).json({ message: 'Invalid city-state format' });
      }
      
      // Last part is the state
      const stateIndex = parts.length - 1;
      const state = parts[stateIndex];
      
      // Everything before is the city (handle multi-word cities like "san-francisco")
      const city = parts.slice(0, stateIndex).join(' ').replace(/-/g, ' ');
      
      console.log(`Looking up bookstores in city: ${city}, state: ${state}`);
      
      // Get bookstores that match both city and state
      const bookstores = await storageImpl.getFilteredBookstores({ 
        city: city,
        state: state 
      });
      
      res.json(bookstores);
    } catch (error) {
      console.error('Error in city-state endpoint:', error);
      res.status(500).json({ message: 'Error fetching bookstores by city and state' });
    }
  });
  
  // Get bookstores by county (for county pages)
  app.get("/api/bookstores/county/:county", async (req, res) => {
    try {
      const county = req.params.county;
      
      console.log(`Looking up bookstores in county: ${county}`);
      
      // Get the bookstores by county using our enhanced matching logic
      if (!storageImpl.getBookstoresByCounty) {
        return res.status(501).json({ error: 'County filtering not implemented' });
      }
      const bookstores = await storageImpl.getBookstoresByCounty(county);
      console.log(`Found ${bookstores.length} bookstores in county: ${county}`);
      
      // Even if no bookstores are found, still return success with empty array
      res.json(bookstores);
    } catch (error) {
      console.error('Error fetching bookstores by county:', error);
      res.status(500).json({ message: 'Error fetching bookstores by county' });
    }
  });
  
  // Get bookstores by county and state combination (SEO-friendly URLs)
  app.get("/api/bookstores/county-state/:countyState", async (req, res) => {
    try {
      const countyStateCombined = req.params.countyState;
      const parts = countyStateCombined.split('-');
      
      if (parts.length < 2) {
        return res.status(400).json({ message: 'Invalid county-state format' });
      }
      
      // Last part is the state
      const stateIndex = parts.length - 1;
      const state = parts[stateIndex];
      
      // Everything before is the county (handle multi-word counties like "los-angeles")
      const county = parts.slice(0, stateIndex).join(' ').replace(/-/g, ' ');
      
      console.log(`Looking up bookstores in county: ${county}, state: ${state}`);
      
      // Get bookstores that match both county and state
      if (!storageImpl.getBookstoresByCountyState) {
        return res.status(501).json({ error: 'County-state filtering not implemented' });
      }
      const bookstores = await storageImpl.getBookstoresByCountyState(county, state);
      
      res.json(bookstores);
    } catch (error) {
      console.error('Error in county-state endpoint:', error);
      res.status(500).json({ message: 'Error fetching bookstores by county and state' });
    }
  });
  
  // Get all counties
  app.get("/api/counties", async (req, res) => {
    try {
      if (!storageImpl.getAllCounties) {
        // If method doesn't exist, extract counties from bookstores
        const bookstores = await storageImpl.getBookstores();
        const counties = new Set<string>();
        bookstores
          .filter(bookstore => bookstore.live !== false)
          .forEach(bookstore => {
            // @ts-ignore - county field exists in data but might not be fully added to type yet
            if (bookstore.county && bookstore.county.trim() !== '') {
              counties.add(bookstore.county);
            }
          });
        return res.json(Array.from(counties).sort());
      }
      const counties = await storageImpl.getAllCounties();
      res.json(counties);
    } catch (error) {
      console.error('Error fetching counties:', error);
      res.status(500).json({ message: 'Error fetching counties' });
    }
  });
  
  // Get counties by state
  app.get("/api/states/:state/counties", async (req, res) => {
    try {
      const state = req.params.state;
      if (!storageImpl.getCountiesByState) {
        // If method doesn't exist, extract counties from bookstores for this state
        const bookstores = await storageImpl.getBookstoresByState(state);
        const counties = new Set<string>();
        bookstores
          .filter(bookstore => bookstore.live !== false)
          .forEach(bookstore => {
            // @ts-ignore - county field exists in data but might not be fully added to type yet
            if (bookstore.county && bookstore.county.trim() !== '') {
              counties.add(bookstore.county);
            }
          });
        return res.json(Array.from(counties).sort());
      }
      const counties = await storageImpl.getCountiesByState(state);
      res.json(counties);
    } catch (error) {
      console.error('Error fetching counties by state:', error);
      res.status(500).json({ message: 'Error fetching counties by state' });
    }
  });
  
  /**
   * Get client-side configuration (e.g., Mapbox access token)
   * 
   * SECURITY NOTES:
   * - This endpoint exposes the Mapbox access token to the client (required for Mapbox GL JS)
   * - The token should be restricted in Mapbox dashboard:
   *   1. Set URL restrictions to only allow your domain(s)
   *   2. Use a public token (pk.*) not a secret token (sk.*)
   *   3. Limit scopes to only what's needed (e.g., styles:read, fonts:read)
   *   4. Set rate limits in Mapbox dashboard
   * - This endpoint is rate-limited to prevent token scraping
   * - CORS headers restrict which origins can access this endpoint
   */
  app.get("/api/config", (req, res) => {
    // Set security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    
    // CORS: Only allow requests from same origin or configured allowed origins
    const origin = req.headers.origin;
    const host = req.get('host');
    const protocol = req.protocol;
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];
    
    // Same-origin requests don't send Origin header, so we allow them
    // For cross-origin requests, check if origin is allowed
    if (origin) {
      const isSameOrigin = origin === `${protocol}://${host}`;
      const isAllowedOrigin = allowedOrigins.length > 0 && allowedOrigins.some(allowed => origin.startsWith(allowed));
      
      if (isSameOrigin || isAllowedOrigin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
      // If origin is present but not allowed, don't set CORS headers (request will be blocked)
    }
    // If no origin header, it's a same-origin request (no CORS headers needed)
    
    // Only expose token if it exists
    const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN || '';
    
    // Validate token format (should be a public token starting with 'pk.')
    if (mapboxToken && !mapboxToken.startsWith('pk.')) {
      console.warn('WARNING: Mapbox token does not appear to be a public token (should start with "pk.")');
    }
    
    res.json({
      mapboxAccessToken: mapboxToken
    });
  });

  // Get all features
  app.get("/api/features", async (req, res) => {
    try {
      const features = await storageImpl.getFeatures();
      res.json(features);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch features" });
    }
  });

  // Get events for a bookshop
  app.get("/api/bookstores/:id/events", async (req, res) => {
    try {
      const bookshopId = parseInt(req.params.id);
      if (isNaN(bookshopId)) {
        return res.status(400).json({ message: "Invalid bookshop ID" });
      }
      
      const events = await storageImpl.getEventsByBookshop(bookshopId);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });
  
  // Get all events
  app.get("/api/events", async (req, res) => {
    try {
      const events = await storageImpl.getEvents();
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });
  
  // Get events by month and year
  app.get("/api/events/calendar", async (req, res) => {
    try {
      // Extract month and year from query parameters
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
      const month = req.query.month ? parseInt(req.query.month as string) - 1 : new Date().getMonth(); // JS months are 0-indexed
      
      if (isNaN(year) || isNaN(month) || month < 0 || month > 11) {
        return res.status(400).json({ message: "Invalid month or year" });
      }
      
      // Get all events
      const allEvents = await storageImpl.getEvents();
      
      // Filter events for the specified month and year
      const eventsInMonth = allEvents.filter(event => {
        // Parse the event date (assuming format is "YYYY-MM-DD" or similar)
        try {
          const eventDate = new Date(event.date);
          return eventDate.getFullYear() === year && eventDate.getMonth() === month;
        } catch (e) {
          console.error(`Error parsing date for event ${event.id}:`, e);
          return false;
        }
      });
      
      res.json(eventsInMonth);
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      res.status(500).json({ message: "Failed to fetch calendar events" });
    }
  });
  
  // Submit a new event
  app.post("/api/events", async (req, res) => {
    try {
      // Handle both bookshopId and bookstoreId (form sends bookstoreId)
      const { title, description, date, time, bookshopId, bookstoreId } = req.body;
      const bookshopIdValue = bookshopId || bookstoreId;
      
      // Basic validation
      if (!title || !description || !date || !time || !bookshopIdValue) {
        return res.status(400).json({ message: "All fields are required" });
      }
      
      // Validate and parse bookshop ID
      const bookshopIdNum = parseInt(String(bookshopIdValue), 10);
      if (isNaN(bookshopIdNum) || bookshopIdNum <= 0) {
        return res.status(400).json({ message: "Invalid bookshop ID" });
      }
      
      // Validate field lengths
      if (typeof title !== 'string' || title.length > 200) {
        return res.status(400).json({ message: "Title must be a string and less than 200 characters" });
      }
      if (typeof description !== 'string' || description.length > 5000) {
        return res.status(400).json({ message: "Description must be a string and less than 5000 characters" });
      }
      
      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (typeof date !== 'string' || !dateRegex.test(date)) {
        return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
      }
      
      // Validate time format (HH:MM or HH:MM:SS)
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;
      if (typeof time !== 'string' || !timeRegex.test(time)) {
        return res.status(400).json({ message: "Invalid time format. Use HH:MM or HH:MM:SS" });
      }
      
      // Check if the bookshop exists
      const bookshop = await storageImpl.getBookstore(bookshopIdNum);
      if (!bookshop) {
        return res.status(404).json({ message: "Bookshop not found" });
      }
      
      // Save to Supabase first
      let savedEvent = null;
      if (supabase) {
        try {
              const eventData = {
                bookshop_id: bookshopIdNum,
                title: title.trim(),
                description: description.trim(),
                date: date.trim(),
                time: time.trim()
                // Note: created_at is auto-generated by Supabase (default now())
              };
          
          const { data, error } = await supabase
            .from('events')
            .insert(eventData)
            .select()
            .single();
          
          if (error) {
            console.error('Error saving event to Supabase:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            // Fall through to storage implementation
          } else {
            savedEvent = data;
            console.log('✅ Event saved to Supabase with ID:', data.id);
          }
        } catch (supabaseError) {
          console.error('Error saving to Supabase:', supabaseError);
          // Fall through to storage implementation
        }
      }
      
      // If Supabase save failed or not configured, use storage implementation
      if (!savedEvent) {
        const newEvent = await storageImpl.createEvent({
          bookshopId: parseInt(bookshopIdValue),
          title,
          description,
          date,
          time
        });
        savedEvent = newEvent;
      }
      
      res.status(201).json(savedEvent);
    } catch (error) {
      console.error("Error creating event:", error);
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  // Get all states with bookstores
  app.get("/api/states", async (req, res) => {
    try {
      console.log('Fetching all states for dropdown');
      const bookstores = await storageImpl.getBookstores();
      // Use array-based filtering for better compatibility
      const statesArray = bookstores
        .map(bookstore => bookstore.state)
        .filter(state => state && state.trim() !== "" && state !== "#ERROR!");
      
      // Create a unique array using Set but with a compatible approach
      const uniqueStatesSet = new Set(statesArray);
      const states = Array.from(uniqueStatesSet).sort();
      
      console.log(`Found ${states.length} states for dropdown`);
      res.json(states);
    } catch (error) {
      console.error('Error fetching states:', error);
      res.status(500).json({ message: "Failed to fetch states" });
    }
  });

  // Get all cities in a state with bookstores
  app.get("/api/states/:state/cities", async (req, res) => {
    try {
      let state = req.params.state;
      
      // Handle case sensitivity for state abbreviations (e.g., "ca" -> "CA")
      if (state.length === 2) {
        state = state.toUpperCase();
      }
      // Handle full state names (e.g., "california" -> "CA")
      else if (state.length > 2) {
        const stateMap: {[key: string]: string} = {
          'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
          'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
          'district of columbia': 'DC', 'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI',
          'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
          'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
          'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
          'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
          'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
          'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
          'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
          'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
          'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
          'wisconsin': 'WI', 'wyoming': 'WY',
          'british columbia': 'BC', 'ontario': 'ON', 'quebec': 'QC', 'alberta': 'AB',
          'manitoba': 'MB', 'nova scotia': 'NS', 'new brunswick': 'NB', 'saskatchewan': 'SK'
        };
        
        const abbr = stateMap[state.toLowerCase()];
        if (abbr) {
          state = abbr;
        }
      }
      
      const bookstores = await storageImpl.getBookstoresByState(state);
      
      // Use array-based filtering for better compatibility
      const citiesArray = bookstores
        .map(bookstore => bookstore.city)
        .filter(city => city && city.trim() !== "" && city !== "#ERROR!");
      
      // Create a unique array using Set but with a compatible approach
      const uniqueCitiesSet = new Set(citiesArray);
      const cities = Array.from(uniqueCitiesSet).sort();
      
      res.json(cities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cities" });
    }
  });

  // User registration
  app.post("/api/users/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      const existingUser = await storageImpl.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }
      
      const newUser = await storageImpl.createUser(userData);
      
      // Don't return the password in the response
      const { password, ...userWithoutPassword } = newUser;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  // User login (simplified for demo)
  app.post("/api/users/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      const user = await storageImpl.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Don't return the password in the response
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to login" });
    }
  });

  // Add a bookstore to user favorites
  app.post("/api/users/:id/favorites", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const { bookstoreId } = addToFavoritesSchema.parse(req.body);
      
      const user = await storageImpl.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const bookstore = await storageImpl.getBookstore(bookstoreId);
      if (!bookstore) {
        return res.status(404).json({ message: "Bookstore not found" });
      }
      
      const favorites = user.favorites ? [...user.favorites, bookstoreId.toString()] : [bookstoreId.toString()];
      const updatedUser = await storageImpl.updateUserFavorites(userId, favorites);
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update favorites" });
      }
      
      // Don't return the password in the response
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid favorite data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add to favorites" });
    }
  });

  // Remove a bookstore from user favorites
  app.delete("/api/users/:id/favorites/:bookstoreId", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const bookstoreId = parseInt(req.params.bookstoreId);
      
      if (isNaN(userId) || isNaN(bookstoreId)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      const user = await storageImpl.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const favorites = user.favorites ? user.favorites.filter(id => id !== bookstoreId.toString()) : [];
      const updatedUser = await storageImpl.updateUserFavorites(userId, favorites);
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update favorites" });
      }
      
      // Don't return the password in the response
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to remove from favorites" });
    }
  });

  // Submit a new bookstore or suggest changes to an existing one
  // Note: Rate limiting is applied at the app level in server/index.ts
  app.post("/api/bookstores/submit", async (req, res) => {
    try {
      const { submitterEmail, submitterName, isNewSubmission, existingBookstoreId, bookstoreData } = req.body;
      
      // Validate and sanitize submitter information
      if (!submitterEmail || typeof submitterEmail !== 'string') {
        return res.status(400).json({ message: "Submitter email is required" });
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const sanitizedEmail = submitterEmail.trim().toLowerCase();
      if (!emailRegex.test(sanitizedEmail) || sanitizedEmail.length > 254) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      
      // Sanitize submitter name
      const sanitizedName = submitterName 
        ? String(submitterName).trim().slice(0, 100) 
        : '';
      
      if (sanitizedName && sanitizedName.length < 2) {
        return res.status(400).json({ message: "Submitter name must be at least 2 characters if provided" });
      }
      
      if (isNewSubmission) {
        // For new bookstore submissions
        try {
          // Convert featureIds from string to array if needed (form sends comma-separated string)
          if (bookstoreData.featureIds && typeof bookstoreData.featureIds === 'string') {
            bookstoreData.featureIds = bookstoreData.featureIds
              .split(',')
              .map((id: string) => parseInt(id.trim()))
              .filter((id: number) => !isNaN(id));
          }
          
          const validatedData = insertBookstoreSchema.parse(bookstoreData);
          
          // Mark as not live by default - admin will review before publishing
          const submissionData = {
            ...validatedData,
            live: false
          };
          
          // Save to Supabase
          let savedSubmission = null;
          if (supabase) {
            try {
              // Map to Supabase column names (matching actual schema)
              // The schema uses "imageUrl" (quoted camelCase) and hours_json (jsonb)
              const supabaseData: any = {
                name: validatedData.name,
                street: validatedData.street || null,
                city: validatedData.city || null,
                state: validatedData.state || null,
                zip: validatedData.zip || null,
                county: validatedData.county || null,
                description: validatedData.description || null,
                imageUrl: validatedData.imageUrl || null, // Schema column is "imageUrl" (quoted in SQL, but use camelCase in JS)
                website: validatedData.website || null,
                phone: validatedData.phone || null,
                // Use hours_json (jsonb) for structured hours data
                hours_json: validatedData.hours 
                  ? (typeof validatedData.hours === 'string' 
                      ? (() => {
                          try { return JSON.parse(validatedData.hours); } 
                          catch { return validatedData.hours; }
                        })()
                      : validatedData.hours)
                  : null,
                latitude: validatedData.latitude || null,
                longitude: validatedData.longitude || null,
                // Convert featureIds to text array format (feature_ids is text[] in schema)
                feature_ids: Array.isArray(validatedData.featureIds) 
                  ? validatedData.featureIds.map(f => String(f).trim()).filter(f => f)
                  : (validatedData.featureIds ? [String(validatedData.featureIds).trim()].filter(f => f) : null),
                live: false
                // Note: submitter_email, submitter_name, submission_type columns don't exist in schema
                // Note: created_at is auto-generated by Supabase (default now())
                // Note: lat_numeric and lng_numeric may be auto-converted by bookstore_auto_convert_trigger
              };
              
              const { data, error } = await supabase
                .from('bookstores')
                .insert(supabaseData)
                .select()
                .single();
              
              if (error) {
                console.error('Error saving submission to Supabase:', error);
                console.error('Error details:', JSON.stringify(error, null, 2));
                // Return error to client so they know submission failed
                return res.status(500).json({ 
                  message: "Failed to save submission to database",
                  error: error.message,
                  details: error.details || error.hint || 'Please check server logs for more details'
                });
              } else {
                savedSubmission = data;
                console.log('Submission saved to Supabase with ID:', data.id);
              }
            } catch (supabaseError) {
              console.error('Error saving to Supabase:', supabaseError);
              // Continue with email notification even if Supabase save fails
            }
          } else {
            console.warn('Supabase not configured - submission not saved to database');
          }
          
          // Send notification email to admin
          const notificationSent = await sendBookstoreSubmissionNotification(
            process.env.ADMIN_EMAIL || 'admin@indiebookshop.com',
            sanitizedEmail,
            {
              ...submissionData,
              submitterName: sanitizedName,
              submissionType: 'new',
              supabaseId: savedSubmission?.id
            }
          );
          
          if (notificationSent) {
            res.status(201).json({ 
              message: "Bookstore submission received successfully. We'll review it shortly." 
            });
          } else {
            // Still return success if saved to Supabase, even if email failed
            res.status(201).json({ 
              message: "Bookstore submission saved but notification email failed. We'll still review your submission." 
            });
          }
        } catch (error) {
          if (error instanceof z.ZodError) {
            return res.status(400).json({ 
              message: "Invalid bookstore data", 
              errors: error.errors 
            });
          }
          throw error;
        }
      } else {
        // For existing bookstore change suggestions
        // Handle both existingBookstoreId (legacy) and existingBookshopName (new)
        const { existingBookstoreId, existingBookshopName } = req.body;
        
        let bookstore = null;
        
        if (existingBookshopName) {
          // Look up by name (format: "Name - City, State")
          const nameParts = existingBookshopName.split(' - ');
          if (nameParts.length === 2) {
            const [name, location] = nameParts;
            const locationParts = location.split(', ');
            if (locationParts.length === 2) {
              const [city, state] = locationParts;
              // Get all bookstores and find by name, city, and state
              const allBookstores = await storageImpl.getBookstores();
              bookstore = allBookstores.find(b => 
                b.name === name && b.city === city && b.state === state
              );
            }
          }
          
          if (!bookstore) {
            return res.status(404).json({ message: "Bookshop not found. Please select a bookshop from the list." });
          }
        } else if (existingBookstoreId) {
          // Legacy: look up by ID
          bookstore = await storageImpl.getBookstore(parseInt(existingBookstoreId));
          if (!bookstore) {
            return res.status(404).json({ message: "Existing bookstore not found" });
          }
        } else {
          return res.status(400).json({ message: "Please select the bookshop you want to update" });
        }
        
        // Validate bookstoreData for change suggestions
        try {
          insertBookstoreSchema.parse(bookstoreData);
        } catch (error) {
          if (error instanceof z.ZodError) {
            return res.status(400).json({ 
              message: "Invalid bookstore data", 
              errors: error.errors 
            });
          }
          throw error;
        }
        
        // Send notification email to admin about the suggested changes
        const notificationSent = await sendBookstoreSubmissionNotification(
          process.env.ADMIN_EMAIL || 'admin@indiebookshop.com',
          sanitizedEmail,
          {
            ...bookstoreData,
            submitterName: sanitizedName,
            existingBookstoreId,
            submissionType: 'change',
            existingData: bookstore
          }
        );
        
        if (notificationSent) {
          res.status(200).json({ 
            message: "Bookstore change suggestion received successfully. We'll review it shortly." 
          });
        } else {
          res.status(200).json({ 
            message: "Bookstore change suggestion saved but notification email failed. We'll still review your submission." 
          });
        }
      }
    } catch (error) {
      console.error("Error processing bookstore submission:", error);
      res.status(500).json({ message: "Failed to process bookstore submission" });
    }
  });

  // Contact form submission
  app.post("/api/contact", async (req, res) => {
    try {
      const { name, email, reason, subject, message } = req.body;
      
      // Validate required fields
      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json({ message: "Name is required and must be at least 2 characters" });
      }
      
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: "Email is required" });
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const sanitizedEmail = email.trim().toLowerCase();
      if (!emailRegex.test(sanitizedEmail) || sanitizedEmail.length > 254) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      
      if (!reason || typeof reason !== 'string') {
        return res.status(400).json({ message: "Reason is required" });
      }
      
      if (!subject || typeof subject !== 'string' || subject.trim().length < 3) {
        return res.status(400).json({ message: "Subject is required and must be at least 3 characters" });
      }
      
      if (!message || typeof message !== 'string' || message.trim().length < 10) {
        return res.status(400).json({ message: "Message is required and must be at least 10 characters" });
      }
      
      // Sanitize inputs
      const sanitizedName = name.trim().slice(0, 100);
      const sanitizedSubject = subject.trim().slice(0, 200);
      const sanitizedMessage = message.trim().slice(0, 5000);
      const sanitizedReason = reason.trim();
      
      // Send email to info@bluestonebrands.com
      const emailSent = await sendContactFormEmail(
        'info@bluestonebrands.com',
        {
          name: sanitizedName,
          email: sanitizedEmail,
          reason: sanitizedReason,
          subject: sanitizedSubject,
          message: sanitizedMessage
        }
      );
      
      if (emailSent) {
        res.status(200).json({ 
          message: "Your message has been sent successfully. We'll get back to you soon." 
        });
      } else {
        res.status(500).json({ 
          message: "Failed to send message. Please try again later or email us directly." 
        });
      }
    } catch (error) {
      console.error("Error processing contact form:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      res.status(500).json({ message: "Failed to process contact form submission" });
    }
  });


  // Sitemap route
  app.get("/sitemap.xml", generateSitemap);
  
  // Robots.txt route - ensure it's properly served
  app.get("/robots.txt", (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'indiebookshop.com';
    const baseUrl = `${protocol}://${host}`;
    
    const robotsTxt = `# robots.txt for IndiebookShop.com
User-agent: *
Allow: /

# Allow all search engines to access all content
Disallow: /api/
Disallow: /admin/

# Point to sitemap
Sitemap: ${baseUrl}/sitemap.xml
`;
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.send(robotsTxt);
  });
  
  const httpServer = createServer(app);
  return httpServer;
}