// Serverless-compatible routes implementation

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

  // Get user location based on IP address
  app.get('/api/location', async (req, res) => {
    try {
      // Get client IP address
      const clientIp = req.ip || 
        req.headers['x-forwarded-for']?.toString().split(',')[0] || 
        req.headers['x-real-ip']?.toString() || 
        req.headers['cf-connecting-ip']?.toString() || // Cloudflare
        '';

      // Use ipapi.co for IP geolocation (free tier: 1000 requests/day)
      // Fallback to ip-api.com if needed
      const ipToCheck = clientIp === '::1' || clientIp === '127.0.0.1' ? '' : clientIp;
      
      if (!ipToCheck) {
        // For localhost, return null or a default location
        return res.json({ city: null, state: null, country: null });
      }

      try {
        // Try ipapi.co first
        const response = await fetch(`https://ipapi.co/${ipToCheck}/json/`);
        if (response.ok) {
          const data = await response.json();
          if (data.error) {
            throw new Error('IP geolocation error');
          }
          return res.json({
            city: data.city || null,
            state: data.region_code || data.region || null,
            country: data.country_code || null,
            latitude: data.latitude || null,
            longitude: data.longitude || null
          });
        }
      } catch (error) {
        console.log('ipapi.co failed, trying ip-api.com');
      }

      // Fallback to ip-api.com
      const fallbackResponse = await fetch(`http://ip-api.com/json/${ipToCheck}`);
      if (fallbackResponse.ok) {
        const data = await fallbackResponse.json();
        if (data.status === 'success') {
          return res.json({
            city: data.city || null,
            state: data.region || data.regionName || null,
            country: data.countryCode || null,
            latitude: data.lat || null,
            longitude: data.lon || null
          });
        }
      }

      // If both fail, return null
      res.json({ city: null, state: null, country: null });
    } catch (error) {
      console.error('Error fetching user location:', error);
      res.json({ city: null, state: null, country: null });
    }
  });

  return { app };
}