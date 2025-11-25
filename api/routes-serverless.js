// Serverless-compatible routes implementation
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client for serverless functions
// This is inlined here to ensure it's included in the Vercel bundle
function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn(
      'Serverless: Supabase environment variables are missing. SUBMISSIONS WILL NOT BE SAVED. ' +
      'Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in Vercel.'
    );
    return null;
  }

  // Use service role key for server-side operations (bypasses RLS)
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Rate limiting middleware for submission endpoints
 * Limits: 5 requests per 15 minutes per IP
 * Note: In serverless, each function instance has its own memory store
 */
const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many submissions from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Use memory store (default) - works per serverless function instance
  store: undefined, // Use default MemoryStore
});

/**
 * Register API routes for the serverless environment
 */
export async function registerRoutes(app, storageImpl) {
  // Get all bookshops
  app.get('/api/bookstores', async (req, res) => {
    try {
      const bookstores = await storageImpl.getBookstores();
      res.json(bookstores);
    } catch (error) {
      console.error('Serverless Error getting bookstores:', error);
      res.status(500).json({ error: 'Failed to fetch bookstores' });
    }
  });
  
  // Get filtered bookshops - IMPORTANT: This must come before the :id route
  app.get('/api/bookstores/filter', async (req, res) => {
    try {
      console.log('Serverless: Processing filter request with params:', req.query);
      
      // Normalize state input (handles both abbreviations and full names, any case)
      let normalizedState = undefined;
      if (req.query.state) {
        const stateInput = String(req.query.state).trim();
        // If it's a 2-character abbreviation, just uppercase it
        // Otherwise, let the storage layer handle full name normalization
        normalizedState = stateInput.length === 2 ? stateInput.toUpperCase() : stateInput;
      }
      
      const filters = {
        state: normalizedState,
        city: req.query.city,
        county: req.query.county, // Add support for county filtering
        featureIds: req.query.features ? req.query.features.split(',').map(f => parseInt(f)) : undefined
      };
      
      if (filters.county) {
        console.log(`Serverless: Filter request includes county: ${filters.county}`);
      }
      
      const bookstores = await storageImpl.getFilteredBookstores(filters);
      console.log(`Serverless: Filtered bookstores returned ${bookstores.length} results`);
      res.json(bookstores);
    } catch (error) {
      console.error('Serverless Error filtering bookstores:', error);
      res.status(500).json({ error: 'Failed to filter bookstores', details: error.message });
    }
  });

  // Get a specific bookstore by slug (for SEO-friendly URLs)
  // IMPORTANT: This must come BEFORE the :id route to prevent conflict
  app.get('/api/bookstores/by-slug/:slug', async (req, res) => {
    try {
      const slug = req.params.slug;
      console.log(`Serverless: Looking up bookstore with slug: ${slug}`);
      
      const bookstore = await storageImpl.getBookstoreBySlug(slug);
      if (!bookstore) {
        console.log(`Serverless: No bookstore found with slug: ${slug}`);
        return res.status(404).json({ message: 'Bookstore not found' });
      }
      
      res.json(bookstore);
    } catch (error) {
      console.error('Serverless Error fetching bookstore by slug:', error);
      res.status(500).json({ message: 'Failed to fetch bookstore by slug' });
    }
  });

  // Get a specific bookshop by ID
  app.get('/api/bookstores/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const bookstore = await storageImpl.getBookstore(id);
      
      if (!bookstore) {
        return res.status(404).json({ error: 'Bookshop not found' });
      }
      
      res.json(bookstore);
    } catch (error) {
      console.error(`Serverless Error getting bookstore ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to fetch bookshop' });
    }
  });

  // Get bookshops by state
  app.get('/api/states/:state/bookstores', async (req, res) => {
    try {
      const bookstores = await storageImpl.getBookstoresByState(req.params.state);
      res.json(bookstores);
    } catch (error) {
      console.error(`Serverless Error getting bookstores for state ${req.params.state}:`, error);
      res.status(500).json({ error: 'Failed to fetch bookstores for state' });
    }
  });

  // Get bookshops by city
  app.get('/api/cities/:city/bookstores', async (req, res) => {
    try {
      const bookstores = await storageImpl.getBookstoresByCity(req.params.city);
      res.json(bookstores);
    } catch (error) {
      console.error(`Serverless Error getting bookstores for city ${req.params.city}:`, error);
      res.status(500).json({ error: 'Failed to fetch bookstores for city' });
    }
  });

  // Get bookshops by feature
  app.get('/api/features/:featureId/bookstores', async (req, res) => {
    try {
      const featureId = parseInt(req.params.featureId);
      const bookstores = await storageImpl.getBookstoresByFeatures([featureId]);
      res.json(bookstores);
    } catch (error) {
      console.error(`Serverless Error getting bookstores for feature ${req.params.featureId}:`, error);
      res.status(500).json({ error: 'Failed to fetch bookstores for feature' });
    }
  });

  // Get filtered bookshops
  app.get('/api/bookstores/filter', async (req, res) => {
    try {
      const filters = {
        state: req.query.state,
        city: req.query.city,
        featureIds: req.query.features ? req.query.features.split(',').map(f => parseInt(f)) : undefined
      };
      
      const bookstores = await storageImpl.getFilteredBookstores(filters);
      res.json(bookstores);
    } catch (error) {
      console.error('Serverless Error filtering bookstores:', error);
      res.status(500).json({ error: 'Failed to filter bookstores' });
    }
  });

  // Get all features
  app.get('/api/features', async (req, res) => {
    try {
      const features = await storageImpl.getFeatures();
      res.json(features);
    } catch (error) {
      console.error('Serverless Error getting features:', error);
      res.status(500).json({ error: 'Failed to fetch features' });
    }
  });

  // Get a specific feature by ID
  app.get('/api/features/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const feature = await storageImpl.getFeature(id);
      
      if (!feature) {
        return res.status(404).json({ error: 'Feature not found' });
      }
      
      res.json(feature);
    } catch (error) {
      console.error(`Serverless Error getting feature ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to fetch feature' });
    }
  });

  // Get all events
  app.get('/api/events', async (req, res) => {
    try {
      const events = await storageImpl.getEvents();
      res.json(events);
    } catch (error) {
      console.error('Serverless Error getting events:', error);
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  });

  // Get events for a specific bookshop
  app.get('/api/bookstores/:bookshopId/events', async (req, res) => {
    try {
      const bookshopId = parseInt(req.params.bookshopId);
      const events = await storageImpl.getEventsByBookshop(bookshopId);
      res.json(events);
    } catch (error) {
      console.error(`Serverless Error getting events for bookshop ${req.params.bookshopId}:`, error);
      res.status(500).json({ error: 'Failed to fetch events for bookshop' });
    }
  });

  // Get all states with bookshops
  app.get('/api/states', async (req, res) => {
    try {
      console.log('Serverless: Fetching all states for dropdown');
      const bookstores = await storageImpl.getBookstores();
      const states = [...new Set(bookstores.map(b => b.state))].sort();
      console.log(`Serverless: Found ${states.length} states for dropdown`);
      res.json(states);
    } catch (error) {
      console.error('Serverless Error getting states:', error);
      res.status(500).json({ error: 'Failed to fetch states' });
    }
  });

  // Get all cities with bookshops
  app.get('/api/cities', async (req, res) => {
    try {
      const bookstores = await storageImpl.getBookstores();
      const cities = [...new Set(bookstores.map(b => b.city))].sort();
      res.json(cities);
    } catch (error) {
      console.error('Serverless Error getting cities:', error);
      res.status(500).json({ error: 'Failed to fetch cities' });
    }
  });

  // Get cities for a specific state
  app.get('/api/states/:state/cities', async (req, res) => {
    try {
      const bookstores = await storageImpl.getBookstoresByState(req.params.state);
      const cities = [...new Set(bookstores.map(b => b.city))].sort();
      res.json(cities);
    } catch (error) {
      console.error(`Serverless Error getting cities for state ${req.params.state}:`, error);
      res.status(500).json({ error: 'Failed to fetch cities for state' });
    }
  });

  // Get all counties
  app.get('/api/counties', async (req, res) => {
    try {
      const counties = await storageImpl.getAllCounties ? await storageImpl.getAllCounties() : [];
      res.json(counties);
    } catch (error) {
      console.error('Serverless Error getting counties:', error);
      res.status(500).json({ error: 'Failed to fetch counties' });
    }
  });

  // Get counties for a specific state
  app.get('/api/states/:state/counties', async (req, res) => {
    try {
      const counties = await storageImpl.getCountiesByState ? await storageImpl.getCountiesByState(req.params.state) : [];
      res.json(counties);
    } catch (error) {
      console.error(`Serverless Error getting counties for state ${req.params.state}:`, error);
      res.status(500).json({ error: 'Failed to fetch counties for state' });
    }
  });

  // Get configuration for frontend
  app.get('/api/config', (req, res) => {
    res.json({
      mapboxAccessToken: process.env.MAPBOX_ACCESS_TOKEN,
      isServerless: true
    });
  });

  // Submit a new bookstore or suggest changes to an existing one
  // Apply rate limiting to prevent spam
  app.post('/api/bookstores/submit', submissionLimiter, async (req, res) => {
    try {
      const supabase = getSupabaseClient();
      const { sendBookstoreSubmissionNotification } = await import('./email-serverless.js');
      
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
        // For new bookstore submissions - save to Supabase
        try {
          // Convert featureIds from string to array if needed (form sends comma-separated string)
          if (bookstoreData.featureIds && typeof bookstoreData.featureIds === 'string') {
            bookstoreData.featureIds = bookstoreData.featureIds
              .split(',')
              .map(id => parseInt(id.trim()))
              .filter(id => !isNaN(id));
          }
          
          // Prepare submission data for Supabase
          // Note: Column names must match the actual schema
          // The schema uses "imageUrl" (quoted camelCase) and hours_json (jsonb)
          const submissionData = {
            name: bookstoreData.name,
            street: bookstoreData.street || null,
            city: bookstoreData.city || null,
            state: bookstoreData.state || null,
            zip: bookstoreData.zip || null,
            county: bookstoreData.county || null,
            description: bookstoreData.description || null,
            imageUrl: bookstoreData.imageUrl || null, // Schema column is "imageUrl" (quoted in SQL, but use camelCase in JS)
            website: bookstoreData.website || null,
            phone: bookstoreData.phone || null,
            // Use hours_json (jsonb) for structured hours data
            hours_json: bookstoreData.hours 
              ? (typeof bookstoreData.hours === 'string' 
                  ? (() => {
                      try { return JSON.parse(bookstoreData.hours); } 
                      catch { return bookstoreData.hours; }
                    })()
                  : bookstoreData.hours)
              : null,
            latitude: bookstoreData.latitude || null,
            longitude: bookstoreData.longitude || null,
            // Convert featureIds to text array format (feature_ids is text[] in schema)
            feature_ids: bookstoreData.featureIds 
              ? (Array.isArray(bookstoreData.featureIds) 
                  ? bookstoreData.featureIds.map(f => String(f).trim()).filter(f => f)
                  : String(bookstoreData.featureIds).split(',').map(f => String(f).trim()).filter(f => f))
              : null,
            live: false // Mark as not live - admin will review before publishing
            // Note: submitter_email, submitter_name, submission_type columns don't exist in schema
            // Note: created_at is auto-generated by Supabase (default now())
            // Note: lat_numeric and lng_numeric may be auto-converted by bookstore_auto_convert_trigger
          };
          
          // Save to Supabase
          let savedSubmission = null;
          const { isDevelopment } = await import('./utils-serverless.js');
          
          if (isDevelopment()) {
            console.log('Serverless: Attempting to save submission to Supabase...');
            console.log('Serverless: Supabase client exists?', !!supabase);
            console.log('Serverless: Submission data:', JSON.stringify(submissionData, null, 2));
          }
          
          if (supabase) {
            const { data, error } = await supabase
              .from('bookstores')
              .insert(submissionData)
              .select()
              .single();
            
            if (error) {
              console.error('Serverless: Error saving submission to Supabase:', error);
              console.error('Serverless: Error code:', error.code);
              console.error('Serverless: Error message:', error.message);
              console.error('Serverless: Error details:', error.details);
              console.error('Serverless: Error hint:', error.hint);
              console.error('Serverless: Full error:', JSON.stringify(error, null, 2));
              // Return error to client so they know submission failed
              return res.status(500).json({ 
                message: "Failed to save submission to database",
                error: error.message,
                code: error.code,
                details: error.details || error.hint || 'Please check server logs for more details'
              });
            } else {
              savedSubmission = data;
              if (isDevelopment()) {
                console.log('Serverless: ✅ Submission saved to Supabase successfully!');
                console.log('Serverless: Saved record ID:', data.id);
                console.log('Serverless: Saved record:', JSON.stringify(data, null, 2));
              } else {
                console.log('Serverless: Submission saved to Supabase with ID:', data.id);
              }
            }
          } else {
            console.error('Serverless: ❌ Supabase client is NULL - environment variables may be missing');
            if (isDevelopment()) {
              console.error('Serverless: SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'MISSING');
              console.error('Serverless: SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING');
            }
            return res.status(500).json({ 
              message: "Database not configured. Please contact support."
              // Don't expose environment variable status in production
            });
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
          console.error('Serverless: Error processing new submission:', error);
          res.status(500).json({ message: "Failed to process bookstore submission" });
        }
      } else {
        // For existing bookstore change suggestions
        if (!existingBookstoreId) {
          return res.status(400).json({ message: "Existing bookstore ID is required for changes" });
        }
        
        const bookstore = await storageImpl.getBookstore(parseInt(existingBookstoreId));
        if (!bookstore) {
          return res.status(404).json({ message: "Existing bookstore not found" });
        }
        
        // Save change suggestion to Supabase (could create a separate table, but for now we'll log it)
        const changeSuggestion = {
          existing_bookstore_id: parseInt(existingBookstoreId),
          submitter_email: sanitizedEmail,
          submitter_name: sanitizedName,
          submission_type: 'change',
          suggested_data: bookstoreData,
          created_at: new Date().toISOString()
        };
        
        // Try to save to a submissions table, or just log it
        if (supabase) {
          // Try to insert into a submissions table (you may need to create this table)
          const { error } = await supabase
            .from('submissions')
            .insert(changeSuggestion)
            .catch(() => {
              // If submissions table doesn't exist, just log the suggestion
              console.log('Serverless: Change suggestion (submissions table may not exist):', changeSuggestion);
            });
          
          if (!error) {
            console.log('Serverless: Change suggestion saved to Supabase');
          }
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
      console.error("Serverless: Error processing bookstore submission:", error);
      res.status(500).json({ message: "Failed to process bookstore submission" });
    }
  });

  // Submit a new event
  // Apply rate limiting to prevent spam
  app.post('/api/events', submissionLimiter, async (req, res) => {
    try {
      const supabase = getSupabaseClient();
      const { isValidDate, isValidTime, safeParseInt } = await import('./utils-serverless.js');
      
      // Handle both bookshopId and bookstoreId (form sends bookstoreId)
      const { title, description, date, time, bookshopId, bookstoreId } = req.body;
      const bookshopIdValue = bookshopId || bookstoreId;
      
      // Basic validation
      if (!title || !description || !date || !time || !bookshopIdValue) {
        return res.status(400).json({ message: "All fields are required" });
      }
      
      // Validate field lengths
      if (typeof title !== 'string' || title.length > 200) {
        return res.status(400).json({ message: "Title must be a string and less than 200 characters" });
      }
      if (typeof description !== 'string' || description.length > 5000) {
        return res.status(400).json({ message: "Description must be a string and less than 5000 characters" });
      }
      
      // Validate date format (YYYY-MM-DD)
      if (!isValidDate(date)) {
        return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
      }
      
      // Validate time format (HH:MM or HH:MM:SS)
      if (!isValidTime(time)) {
        return res.status(400).json({ message: "Invalid time format. Use HH:MM or HH:MM:SS" });
      }
      
      // Validate and parse bookshop ID
      const bookshopIdNum = safeParseInt(bookshopIdValue);
      if (!bookshopIdNum) {
        return res.status(400).json({ message: "Invalid bookshop ID" });
      }
      
      // Check if the bookshop exists
      const bookshop = await storageImpl.getBookstore(bookshopIdNum);
      if (!bookshop) {
        return res.status(404).json({ message: "Bookshop not found" });
      }
      
      // Save to Supabase
      let savedEvent = null;
      const { isDevelopment } = await import('./utils-serverless.js');
      
      if (isDevelopment()) {
        console.log('Serverless: Attempting to save event to Supabase...');
        console.log('Serverless: Supabase client exists?', !!supabase);
      }
      
      if (supabase) {
        const eventData = {
          bookshop_id: bookshopIdNum,
          title: title.trim(),
          description: description.trim(),
          date: date.trim(),
          time: time.trim()
          // Note: created_at is auto-generated by Supabase (default now())
        };
        
        if (isDevelopment()) {
          console.log('Serverless: Event data:', JSON.stringify(eventData, null, 2));
        }
        
        const { data, error } = await supabase
          .from('events')
          .insert(eventData)
          .select()
          .single();
        
        if (error) {
          console.error('Serverless: Error saving event to Supabase:', error);
          console.error('Serverless: Error code:', error.code);
          console.error('Serverless: Error message:', error.message);
          console.error('Serverless: Error details:', error.details);
          console.error('Serverless: Full error:', JSON.stringify(error, null, 2));
          return res.status(500).json({ 
            message: "Failed to save event",
            error: error.message,
            code: error.code,
            details: error.details || error.hint
          });
        }
        
        savedEvent = data;
        if (isDevelopment()) {
          console.log('Serverless: ✅ Event saved to Supabase successfully!');
          console.log('Serverless: Saved event ID:', data.id);
          console.log('Serverless: Saved event:', JSON.stringify(data, null, 2));
        } else {
          console.log('Serverless: Event saved to Supabase with ID:', data.id);
        }
      } else {
        console.error('Serverless: ❌ Supabase client is NULL - environment variables may be missing');
        // Fallback to storage implementation if Supabase not configured
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
      console.error("Serverless: Error creating event:", error);
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  return { app };
}