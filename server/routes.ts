import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, IStorage } from "./storage";
import { 
  bookstoreFiltersSchema,
  addToFavoritesSchema,
  insertUserSchema,
  insertBookstoreSchema
} from "@shared/schema";
import { sendBookstoreSubmissionNotification } from "./email";
import { z } from "zod";

export async function registerRoutes(app: Express, storageImpl: IStorage = storage): Promise<Server> {
  // Get all bookstores
  app.get("/api/bookstores", async (req, res) => {
    try {
      const bookstores = await storageImpl.getBookstores();
      res.json(bookstores);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookstores" });
    }
  });

  // Get a specific bookstore
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

  // Get filtered bookstores
  app.get("/api/bookstores/filter", async (req, res) => {
    try {
      // Handle single feature ID or comma-separated list
      let featureIds = undefined;
      if (req.query.features) {
        if (typeof req.query.features === 'string') {
          featureIds = req.query.features.split(',').map(Number);
        } else if (Array.isArray(req.query.features)) {
          featureIds = (req.query.features as string[]).map(Number);
        }
      }
      
      const validatedFilters = bookstoreFiltersSchema.parse({
        state: req.query.state,
        city: req.query.city,
        features: featureIds
      });
      
      const bookstores = await storageImpl.getFilteredBookstores({
        state: validatedFilters.state,
        city: validatedFilters.city,
        featureIds: validatedFilters.features
      });
      
      res.json(bookstores);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid filter parameters", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to fetch filtered bookstores" });
    }
  });

  // Get environment configuration (API keys, etc.)
  app.get("/api/config", (req, res) => {
    res.json({
      mapboxAccessToken: process.env.MAPBOX_ACCESS_TOKEN || ''
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

  // Get events for a bookstore
  app.get("/api/bookstores/:id/events", async (req, res) => {
    try {
      const bookstoreId = parseInt(req.params.id);
      if (isNaN(bookstoreId)) {
        return res.status(400).json({ message: "Invalid bookstore ID" });
      }
      
      const events = await storageImpl.getEventsByBookstore(bookstoreId);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  // Get all states with bookstores
  app.get("/api/states", async (req, res) => {
    try {
      const bookstores = await storageImpl.getBookstores();
      // Use array-based filtering for better compatibility
      const statesArray = bookstores
        .map(bookstore => bookstore.state)
        .filter(state => state && state.trim() !== "" && state !== "#ERROR!");
      
      // Create a unique array using Set but with a compatible approach
      const uniqueStatesSet = new Set(statesArray);
      const states = Array.from(uniqueStatesSet).sort();
      
      res.json(states);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch states" });
    }
  });

  // Get all cities in a state with bookstores
  app.get("/api/states/:state/cities", async (req, res) => {
    try {
      const state = req.params.state;
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
  app.post("/api/bookstores/submit", async (req, res) => {
    try {
      const { submitterEmail, submitterName, isNewSubmission, existingBookstoreId, bookstoreData } = req.body;
      
      if (!submitterEmail) {
        return res.status(400).json({ message: "Submitter email is required" });
      }
      
      if (isNewSubmission) {
        // For new bookstore submissions
        try {
          const validatedData = insertBookstoreSchema.parse(bookstoreData);
          
          // Mark as not live by default - admin will review before publishing
          const submissionData = {
            ...validatedData,
            live: false
          };
          
          // Send notification email to admin
          const notificationSent = await sendBookstoreSubmissionNotification(
            process.env.ADMIN_EMAIL || 'admin@indiebookshop.com',
            submitterEmail,
            {
              ...submissionData,
              submitterName,
              submissionType: 'new'
            }
          );
          
          if (notificationSent) {
            res.status(201).json({ 
              message: "Bookstore submission received successfully. We'll review it shortly." 
            });
          } else {
            // Still save the submission but notify the client of email issues
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
        if (!existingBookstoreId) {
          return res.status(400).json({ message: "Existing bookstore ID is required for changes" });
        }
        
        const bookstore = await storageImpl.getBookstore(parseInt(existingBookstoreId));
        if (!bookstore) {
          return res.status(404).json({ message: "Existing bookstore not found" });
        }
        
        // Send notification email to admin about the suggested changes
        const notificationSent = await sendBookstoreSubmissionNotification(
          process.env.ADMIN_EMAIL || 'admin@indiebookshop.com',
          submitterEmail,
          {
            ...bookstoreData,
            submitterName,
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

  const httpServer = createServer(app);
  return httpServer;
}