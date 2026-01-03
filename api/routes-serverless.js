// Serverless-compatible routes implementation
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Create Supabase client for serverless functions
// This is inlined here to ensure it's included in the Vercel bundle
function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  // Detailed logging for debugging
  console.log('Serverless: Checking Supabase environment variables...');
  console.log('Serverless: SUPABASE_URL exists?', !!supabaseUrl);
  console.log('Serverless: SUPABASE_URL length:', supabaseUrl?.length || 0);
  console.log('Serverless: SUPABASE_URL starts with https?', supabaseUrl?.startsWith('https://'));
  console.log('Serverless: SUPABASE_SERVICE_ROLE_KEY exists?', !!supabaseServiceKey);
  console.log('Serverless: SUPABASE_SERVICE_ROLE_KEY length:', supabaseServiceKey?.length || 0);
  console.log('Serverless: SUPABASE_SERVICE_ROLE_KEY starts with eyJ?', supabaseServiceKey?.startsWith('eyJ'));

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error(
      'Serverless: ❌ Supabase environment variables are missing. SUBMISSIONS WILL NOT BE SAVED. ' +
      'Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in Vercel.'
    );
    console.error('Serverless: SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING');
    console.error('Serverless: SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'SET' : 'MISSING');
    return null;
  }

  // Validate URL format
  if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
    console.error(
      'Serverless: ❌ Invalid SUPABASE_URL format. Must start with http:// or https://.'
    );
    console.error('Serverless: Current SUPABASE_URL value (first 100 chars):', `"${supabaseUrl.substring(0, 100)}"`);
    return null;
  }

  // Validate URL is a proper URL
  try {
    new URL(supabaseUrl);
  } catch (urlError) {
    console.error('Serverless: ❌ SUPABASE_URL is not a valid URL:', urlError.message);
    console.error('Serverless: SUPABASE_URL value:', `"${supabaseUrl}"`);
    return null;
  }

  try {
    console.log('Serverless: ✅ Creating Supabase client...');
    // Use service role key for server-side operations (bypasses RLS)
    const client = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    console.log('Serverless: ✅ Supabase client created successfully');
    return client;
  } catch (error) {
    console.error('Serverless: ❌ Error creating Supabase client:', error.message);
    console.error('Serverless: Error type:', error.name);
    console.error('Serverless: Error stack:', error.stack);
    console.error('Serverless: SUPABASE_URL:', supabaseUrl ? `"${supabaseUrl.substring(0, 50)}..."` : 'MISSING');
    return null;
  }
}

// Initialize Resend
if (!process.env.RESEND_API_KEY) {
  console.warn('Serverless: RESEND_API_KEY environment variable is not set. Email notifications will not be sent.');
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Escape HTML entities to prevent XSS attacks
function escapeHtml(text) {
  if (typeof text !== 'string') {
    return String(text);
  }
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Validate date format (YYYY-MM-DD)
function isValidDate(date) {
  if (typeof date !== 'string') return false;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;
  const d = new Date(date);
  return d instanceof Date && !isNaN(d.getTime());
}

// Validate time format (HH:MM or HH:MM:SS)
function isValidTime(time) {
  if (typeof time !== 'string') return false;
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;
  return timeRegex.test(time);
}

// Safely parse integer with validation
function safeParseInt(value, min = 1) {
  if (value === null || value === undefined) return null;
  const parsed = parseInt(String(value), 10);
  if (isNaN(parsed) || parsed < min) return null;
  return parsed;
}

// Check if we're in development mode
function isDevelopment() {
  return process.env.NODE_ENV === 'development';
}

// Send email using Resend
async function sendEmail(params) {
  if (!process.env.RESEND_API_KEY) {
    console.error('Serverless: ❌ Cannot send email: RESEND_API_KEY is not set');
    console.error('Serverless: Check Vercel environment variables for RESEND_API_KEY');
    return false;
  }
  
  if (!process.env.RESEND_FROM_EMAIL) {
    console.error('Serverless: ❌ Cannot send email: RESEND_FROM_EMAIL is not set');
    console.error('Serverless: Check Vercel environment variables for RESEND_FROM_EMAIL');
    return false;
  }
  
  if (!resend) {
    console.error('Serverless: ❌ Cannot send email: Resend client not initialized');
    return false;
  }
  
  try {
    console.log('Serverless: Attempting to send email...');
    console.log('Serverless: From:', params.from || process.env.RESEND_FROM_EMAIL);
    console.log('Serverless: To:', params.to);
    console.log('Serverless: Subject:', params.subject);
    
    // Resend expects 'from' to be a string, and 'to' can be string or array
    const fromEmail = params.from || process.env.RESEND_FROM_EMAIL || 'noreply@indiebookshop.com';
    const toEmail = Array.isArray(params.to) ? params.to[0] : params.to;
    
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      replyTo: params.replyTo,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    
    if (error) {
      console.error('Serverless: ❌ Resend email error:', error);
      return false;
    }
    
    console.log('Serverless: ✅ Email sent successfully to', toEmail);
    console.log('Serverless: Resend email ID:', data?.id);
    return true;
  } catch (error) {
    console.error('Serverless: ❌ Resend email error:', error.message);
    console.error('Serverless: Error details:', error);
    return false;
  }
}

// Function to notify about new bookstore submissions
async function sendBookstoreSubmissionNotification(adminEmail, senderEmail, bookstoreData) {
  // Escape user input to prevent XSS in email
  const safeName = escapeHtml(bookstoreData.name || '');
  const safeCity = escapeHtml(bookstoreData.city || '');
  const safeState = escapeHtml(bookstoreData.state || '');
  const safeSenderEmail = escapeHtml(senderEmail);
  
  const subject = `New Bookstore Submission: ${safeName}`;
  
  // Create text and HTML versions for the email
  const text = `
New bookstore submission received:

Name: ${bookstoreData.name || 'N/A'}
Location: ${bookstoreData.city || 'N/A'}, ${bookstoreData.state || 'N/A'}
Submitter Email: ${senderEmail}

Full Details:
${JSON.stringify(bookstoreData, null, 2)}
`;

  const html = `
<h2>New Bookstore Submission</h2>
<p><strong>Name:</strong> ${safeName}</p>
<p><strong>Location:</strong> ${safeCity}, ${safeState}</p>
<p><strong>Submitter Email:</strong> ${safeSenderEmail}</p>

<h3>Full Details:</h3>
<pre>${escapeHtml(JSON.stringify(bookstoreData, null, 2))}</pre>
`;

  return sendEmail({
    to: adminEmail,
    from: process.env.RESEND_FROM_EMAIL || 'noreply@indiebookshop.com',
    subject,
    text,
    html
  });
}

// Function to send contact form submission
async function sendContactFormEmail(adminEmail, contactData) {
  // Escape user input to prevent XSS in email
  const safeName = escapeHtml(contactData.name || '');
  const safeEmail = escapeHtml(contactData.email || '');
  const safeReason = escapeHtml(contactData.reason || '');
  const safeSubject = escapeHtml(contactData.subject || '');
  const safeMessage = escapeHtml(contactData.message || '');
  
  // Map reason codes to readable labels
  const reasonLabels = {
    'listing-update': 'Update a bookshop listing',
    'listing-issue': 'Report incorrect listing information',
    'partnership': 'Partnership or collaboration',
    'technical': 'Technical issue with the site',
    'feedback': 'General feedback or suggestion',
    'press': 'Press or media inquiry',
    'other': 'Other'
  };
  
  const reasonLabel = reasonLabels[contactData.reason] || contactData.reason;
  
  const subject = `Contact Form: ${safeSubject}`;
  
  // Create text and HTML versions for the email
  const text = `
New contact form submission:

Name: ${contactData.name || 'N/A'}
Email: ${contactData.email || 'N/A'}
Reason: ${reasonLabel}
Subject: ${contactData.subject || 'N/A'}

Message:
${contactData.message || 'N/A'}
`;

  const html = `
<h2>New Contact Form Submission</h2>
<p><strong>Name:</strong> ${safeName}</p>
<p><strong>Email:</strong> ${safeEmail}</p>
<p><strong>Reason:</strong> ${escapeHtml(reasonLabel)}</p>
<p><strong>Subject:</strong> ${safeSubject}</p>

<h3>Message:</h3>
<p style="white-space: pre-wrap;">${safeMessage}</p>

<hr>
<p style="color: #666; font-size: 12px;">You can reply directly to this email to respond to ${safeEmail}</p>
`;

  return sendEmail({
    to: adminEmail,
    from: process.env.RESEND_FROM_EMAIL || 'noreply@indiebookshop.com',
    replyTo: contactData.email, // Allow replying directly to the sender
    subject,
    text,
    html
  });
}

/**
 * Rate limiting middleware for submission endpoints
 * Limits: 5 requests per 15 minutes per IP
 * Note: In serverless, each function instance has its own memory store
 */
// Rate limiter for form submissions
// Note: We use trust proxy on Vercel, which is safe because Vercel sets X-Forwarded-For correctly
const submissionLimiter = rateLimit({
  validate: {
    trustProxy: false, // Disable trust proxy validation warning (safe on Vercel)
  },
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many submissions from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Use memory store (default) - works per serverless function instance
  store: undefined, // Use default MemoryStore
});

// Rate limiter for photo proxy endpoint
// Limits: 50 requests per 15 minutes per IP to prevent abuse and quota exhaustion
const photoProxyLimiter = rateLimit({
  validate: {
    trustProxy: false,
  },
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per window
  message: 'Too many photo requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
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

  // Batch endpoint: Get multiple bookshops by IDs (optimized for related bookshops)
  // IMPORTANT: Must come BEFORE /api/bookstores/:id to avoid route conflict
  app.get('/api/bookstores/batch', async (req, res) => {
    try {
      const idsParam = req.query.ids;
      
      if (!idsParam || typeof idsParam !== 'string') {
        return res.status(400).json({ error: 'ids parameter is required (comma-separated list of IDs)' });
      }

      // Parse and validate IDs
      const ids = idsParam.split(',').map(id => {
        const parsed = parseInt(id.trim(), 10);
        return isNaN(parsed) ? null : parsed;
      }).filter(id => id !== null);

      if (ids.length === 0) {
        return res.status(400).json({ error: 'No valid IDs provided' });
      }

      // Limit batch size to prevent abuse
      if (ids.length > 20) {
        return res.status(400).json({ error: 'Maximum 20 bookshops per batch request' });
      }

      // Fetch all bookshops in parallel
      const bookstores = await Promise.all(
        ids.map(async (id) => {
          try {
            return await storageImpl.getBookstore(id);
          } catch (error) {
            console.error(`Serverless Error getting bookstore ${id}:`, error);
            return null; // Return null for failed fetches
          }
        })
      );

      // Filter out null results (failed fetches)
      const validBookstores = bookstores.filter(bookstore => bookstore !== null && bookstore !== undefined);
      
      res.json(validBookstores);
    } catch (error) {
      console.error('Serverless Error in batch bookstore fetch:', error);
      res.status(500).json({ error: 'Failed to fetch bookshops' });
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
          const adminEmail = process.env.ADMIN_EMAIL || 'admin@indiebookshop.com';
          console.log('Serverless: Preparing to send email notification...');
          console.log('Serverless: Admin email:', adminEmail);
          console.log('Serverless: RESEND_API_KEY exists?', !!process.env.RESEND_API_KEY);
          console.log('Serverless: RESEND_FROM_EMAIL:', process.env.RESEND_FROM_EMAIL || 'NOT SET');
          
          const notificationSent = await sendBookstoreSubmissionNotification(
            adminEmail,
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
            console.error('Serverless: ⚠️ Email notification failed, but submission was saved to database');
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
        
        // Save change suggestion to Supabase (could create a separate table, but for now we'll log it)
        const changeSuggestion = {
          existing_bookstore_id: bookstore.id,
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
            existingBookstoreId: bookstore.id,
            existingBookshopName: existingBookshopName || `${bookstore.name} - ${bookstore.city}, ${bookstore.state}`,
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
      console.error("Serverless: Error stack:", error.stack);
      console.error("Serverless: Error name:", error.name);
      console.error("Serverless: Error message:", error.message);
      res.status(500).json({ 
        message: "Failed to process bookstore submission",
        error: error.message,
        type: error.name
      });
    }
  });

  // Submit a new event
  // Apply rate limiting to prevent spam
  app.post('/api/events', submissionLimiter, async (req, res) => {
    try {
      const supabase = getSupabaseClient();
      
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

  // Contact form submission
  app.post('/api/contact', submissionLimiter, async (req, res) => {
    try {
      console.log('Serverless: Contact form submission received');
      console.log('Serverless: Request body:', JSON.stringify(req.body));
      
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
      console.log('Serverless: Attempting to send contact form email to info@bluestonebrands.com');
      console.log('Serverless: RESEND_API_KEY exists?', !!process.env.RESEND_API_KEY);
      console.log('Serverless: RESEND_FROM_EMAIL:', process.env.RESEND_FROM_EMAIL || 'NOT SET');
      
      const emailSent = await sendContactFormEmail('info@bluestonebrands.com', {
        name: sanitizedName,
        email: sanitizedEmail,
        reason: sanitizedReason,
        subject: sanitizedSubject,
        message: sanitizedMessage
      });
      
      console.log('Serverless: Email send result:', emailSent);
      
      if (emailSent) {
        console.log('Serverless: ✅ Contact form email sent successfully');
        res.status(200).json({ 
          message: "Your message has been sent successfully. We'll get back to you soon." 
        });
      } else {
        console.error('Serverless: ❌ Failed to send contact form email');
        res.status(500).json({ 
          message: "Failed to send message. Please try again later or email us directly." 
        });
      }
    } catch (error) {
      console.error("Serverless: Error processing contact form:", error);
      res.status(500).json({ message: "Failed to process contact form submission" });
    }
  });

  // Newsletter signup
  app.post('/api/newsletter-signup', async (req, res) => {
    try {
      console.log('Serverless: Newsletter signup received');
      
      const { email } = req.body;

      // Validate email
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Email is required' });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const sanitizedEmail = email.trim().toLowerCase();
      if (!emailRegex.test(sanitizedEmail) || sanitizedEmail.length > 254) {
        return res.status(400).json({ error: 'Invalid email address' });
      }

      // TODO: Integrate with your email service (Resend, Mailchimp, etc.)
      // For now, just log it
      console.log('Newsletter signup:', sanitizedEmail);
      
      // Example: You could save to Supabase
      // const { data, error } = await supabase
      //   .from('newsletter_subscribers')
      //   .insert({ email: sanitizedEmail, subscribed_at: new Date().toISOString() });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Newsletter signup error:', error);
      return res.status(500).json({ error: 'Signup failed' });
    }
  });

  // Google Places Photo Proxy - with rate limiting
  // Import shared handler to avoid code duplication
  const { handlePlacePhotoRequest } = await import('./utils/place-photo-handler.js');
  
  app.get('/api/place-photo', photoProxyLimiter, async (req, res) => {
    // Only allow GET requests
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    return handlePlacePhotoRequest(req, res);
  });

  // Sitemap route - import and use the sitemap handler
  app.get('/api/sitemap.js', async (req, res) => {
    try {
      const sitemapHandler = (await import('./sitemap.js')).default;
      return sitemapHandler(req, res);
    } catch (error) {
      console.error('Error importing sitemap handler:', error);
      return res.status(500).send('Error loading sitemap');
    }
  });

  // Also handle /sitemap.xml directly
  app.get('/sitemap.xml', async (req, res) => {
    try {
      const sitemapHandler = (await import('./sitemap.js')).default;
      return sitemapHandler(req, res);
    } catch (error) {
      console.error('Error importing sitemap handler:', error);
      return res.status(500).send('Error loading sitemap');
    }
  });

  return { app };
}