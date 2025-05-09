import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  bookstoreFiltersSchema,
  addToFavoritesSchema,
  insertUserSchema
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all bookstores
  app.get("/api/bookstores", async (req, res) => {
    try {
      const bookstores = await storage.getBookstores();
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
      
      const bookstore = await storage.getBookstore(id);
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
      const validatedFilters = bookstoreFiltersSchema.parse({
        state: req.query.state,
        city: req.query.city,
        features: req.query.features ? (req.query.features as string).split(',').map(Number) : undefined
      });
      
      const bookstores = await storage.getFilteredBookstores({
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

  // Get all features
  app.get("/api/features", async (req, res) => {
    try {
      const features = await storage.getFeatures();
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
      
      const events = await storage.getEventsByBookstore(bookstoreId);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  // Get all states with bookstores
  app.get("/api/states", async (req, res) => {
    try {
      const bookstores = await storage.getBookstores();
      const states = [...new Set(bookstores.map(bookstore => bookstore.state))].sort();
      res.json(states);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch states" });
    }
  });

  // Get all cities in a state with bookstores
  app.get("/api/states/:state/cities", async (req, res) => {
    try {
      const state = req.params.state;
      const bookstores = await storage.getBookstoresByState(state);
      const cities = [...new Set(bookstores.map(bookstore => bookstore.city))].sort();
      res.json(cities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cities" });
    }
  });

  // User registration
  app.post("/api/users/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }
      
      const newUser = await storage.createUser(userData);
      
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
      
      const user = await storage.getUserByUsername(username);
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
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const bookstore = await storage.getBookstore(bookstoreId);
      if (!bookstore) {
        return res.status(404).json({ message: "Bookstore not found" });
      }
      
      const favorites = [...user.favorites, bookstoreId.toString()];
      const updatedUser = await storage.updateUserFavorites(userId, favorites);
      
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
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const favorites = user.favorites.filter(id => id !== bookstoreId.toString());
      const updatedUser = await storage.updateUserFavorites(userId, favorites);
      
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

  const httpServer = createServer(app);
  return httpServer;
}
