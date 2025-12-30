import { pgTable, text, serial, integer, boolean, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  favorites: text("favorites").array().default([]),
});

export const features = pgTable("features", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const bookstores = pgTable("bookstores", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  street: text("street").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zip: text("zip").notNull(),
  county: text("county"),  // Added county field for better SEO landing pages
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  website: text("website"),
  phone: text("phone"),
  hours: json("hours").$type<Record<string, string>>(),
  latitude: text("latitude"),
  longitude: text("longitude"),
  featureIds: integer("feature_ids").array().default([]),
  live: boolean("live").default(true),
  // Google Places API enrichment fields
  googlePlaceId: text("google_place_id"),
  googleRating: text("google_rating"), // Stored as text to match latitude/longitude pattern
  googleReviewCount: integer("google_review_count"),
  googleDescription: text("google_description"),
  googlePhotos: json("google_photos").$type<Array<{ photo_reference: string }>>(),
  googleReviews: json("google_reviews").$type<Array<{
    author_name: string;
    rating: number;
    text: string;
    time: number;
  }>>(),
  googlePriceLevel: integer("google_price_level"),
  googleDataUpdatedAt: timestamp("google_data_updated_at"),
  // Google Places contact & basic data fields
  formattedPhone: text("formatted_phone"),
  websiteVerified: text("website_verified"),
  openingHoursJson: json("opening_hours_json").$type<{
    open_now: boolean;
    weekday_text: string[];
    periods?: Array<{
      open: { day: number; time: string };
      close?: { day: number; time: string };
    }>;
  }>(),
  googleMapsUrl: text("google_maps_url"),
  googleTypes: text("google_types").array(),
  formattedAddressGoogle: text("formatted_address_google"),
  businessStatus: text("business_status"),
  contactDataFetchedAt: timestamp("contact_data_fetched_at"),
  // AI-generated description fields
  aiGeneratedDescription: text("ai_generated_description"),
  descriptionGeneratedAt: timestamp("description_generated_at"),
  descriptionValidated: boolean("description_validated").default(false),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  bookshopId: integer("bookshop_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  date: text("date").notNull(),
  time: text("time").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Base bookstore schema with validation
const baseBookstoreSchema = createInsertSchema(bookstores).omit({
  id: true,
});

// Enhanced bookstore schema with length limits and sanitization
export const insertBookstoreSchema = baseBookstoreSchema.extend({
  name: z.string().min(2, "Name must be at least 2 characters").max(200, "Name must be less than 200 characters").trim(),
  street: z.string().min(2, "Street address must be at least 2 characters").max(300, "Street address must be less than 300 characters").trim(),
  city: z.string().min(2, "City must be at least 2 characters").max(100, "City must be less than 100 characters").trim(),
  state: z.string().min(2, "State must be at least 2 characters").max(50, "State must be less than 50 characters").trim(),
  zip: z.string().min(5, "Zip code must be at least 5 characters").max(10, "Zip code must be less than 10 characters").trim(),
  county: z.string().max(100, "County must be less than 100 characters").trim().nullable().optional(),
  description: z.string().max(5000, "Description must be less than 5000 characters").trim().optional(),
  website: z.string().url("Invalid URL format").max(500, "Website URL must be less than 500 characters").trim().nullable().optional().or(z.literal("")),
  phone: z.string().max(20, "Phone number must be less than 20 characters").trim().nullable().optional(),
});

export const insertFeatureSchema = createInsertSchema(features).omit({
  id: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertBookstore = z.infer<typeof insertBookstoreSchema>;
export type Bookstore = typeof bookstores.$inferSelect;

export type InsertFeature = z.infer<typeof insertFeatureSchema>;
export type Feature = typeof features.$inferSelect;

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

export const addToFavoritesSchema = z.object({
  bookstoreId: z.number(),
});

export const bookstoreFiltersSchema = z.object({
  state: z.string().optional(),
  city: z.string().optional(),
  county: z.string().optional(),
  features: z.array(z.number()).optional(),
});
