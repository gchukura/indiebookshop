import { pgTable, text, serial, integer, boolean, json } from "drizzle-orm/pg-core";
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
  county: text("county"),
  zip: text("zip").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  website: text("website"),
  phone: text("phone"),
  hours: json("hours").$type<Record<string, string>>(),
  latitude: text("latitude"),
  longitude: text("longitude"),
  featureIds: integer("feature_ids").array().default([]),
  live: boolean("live").default(true),
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

export const insertBookstoreSchema = createInsertSchema(bookstores).omit({
  id: true,
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
  features: z.array(z.number()).optional(),
});
