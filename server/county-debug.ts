import { Router } from 'express';
import { storage } from './storage';

const countyDebugRouter = Router();

// Test endpoint to check county data in bookstores
countyDebugRouter.get('/debug-county', async (req, res) => {
  try {
    const bookstores = await storage.getBookstores();
    const bookstoresWithCounty = bookstores.filter(store => store.county);
    
    // Get a count of unique counties
    const counties = new Set();
    bookstoresWithCounty.forEach(store => {
      if (store.county) counties.add(store.county);
    });
    
    // Return diagnostic information
    res.json({
      totalBookstores: bookstores.length,
      bookstoresWithCounty: bookstoresWithCounty.length,
      uniqueCounties: Array.from(counties),
      countyCount: counties.size,
      sampleBookstores: bookstoresWithCounty.slice(0, 5).map(store => ({
        id: store.id,
        name: store.name,
        state: store.state,
        county: store.county
      }))
    });
  } catch (error) {
    console.error('Error in county debug endpoint:', error);
    res.status(500).json({ error: 'Failed to fetch county data' });
  }
});

export default countyDebugRouter;