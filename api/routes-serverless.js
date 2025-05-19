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

  // Get configuration for frontend
  app.get('/api/config', (req, res) => {
    res.json({
      mapboxAccessToken: process.env.MAPBOX_ACCESS_TOKEN,
      isServerless: true
    });
  });

  return { app };
}