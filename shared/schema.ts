import { z } from "zod";

// Shapes of the rows read from the Google Sheet. Bookstore rows are parsed and
// coerced by lib/data/bookstore-row.ts; empty cells become null.

export type Bookstore = {
  id: number;
  name: string;
  slug: string | null;  // From the Sheet, else generated from name
  street: string | null;
  city: string;
  state: string;
  zip: string | null;
  county: string | null;
  description: string | null;
  imageUrl: string | null;  // Same-origin /photos/... path (R2), see lib/bookshop-image.ts
  photoAttribution: string | null;  // Photographer name for imageUrl (Google Places author)
  photoAttributionUrl: string | null;
  website: string | null;
  phone: string | null;
  latitude: string | null;
  longitude: string | null;
  featureIds: number[];
  live: boolean;
  // Google Places API enrichment fields
  googlePlaceId: string | null;
  googleRating: string | null;  // Stored as text to match latitude/longitude pattern
  googleReviewCount: number | null;
  googleDescription: string | null;
  googleReviews: Array<{
    author_name: string;
    rating: number;
    text: string;
    time: number;
  }> | null;
  googlePriceLevel: number | null;
  googleDataUpdatedAt: string | null;
  // Google Places contact & basic data fields
  formattedPhone: string | null;
  websiteVerified: boolean | null;
  openingHoursJson: {
    open_now: boolean;
    weekday_text: string[];
    periods?: Array<{
      open: { day: number; time: string };
      close?: { day: number; time: string };
    }>;
  } | null;
  googleMapsUrl: string | null;
  googleTypes: string[] | null;
  formattedAddressGoogle: string | null;
  businessStatus: string | null;
  contactDataFetchedAt: string | null;
  // AI-generated description fields
  aiGeneratedDescription: string | null;
  descriptionGeneratedAt: string | null;
  descriptionValidated: boolean | null;
  descriptionSource: string | null;  // 'ai' | 'template' | 'manual'
};

export type Feature = {
  id: number;
  name: string;
};

export type Event = {
  id: number;
  bookshopId: number;
  title: string;
  description: string;
  date: string;
  time: string;
};

// Validation for submitted bookstores
export const insertBookstoreSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(200, "Name must be less than 200 characters").trim(),
  slug: z.string().nullable().optional(),
  street: z.string().min(2, "Street address must be at least 2 characters").max(300, "Street address must be less than 300 characters").trim(),
  city: z.string().min(2, "City must be at least 2 characters").max(100, "City must be less than 100 characters").trim(),
  state: z.string().min(2, "State must be at least 2 characters").max(50, "State must be less than 50 characters").trim(),
  zip: z.string().min(5, "Zip code must be at least 5 characters").max(10, "Zip code must be less than 10 characters").trim(),
  county: z.string().max(100, "County must be less than 100 characters").trim().nullable().optional(),
  description: z.string().max(5000, "Description must be less than 5000 characters").trim().optional(),
  imageUrl: z.string().nullable().optional(),
  website: z.string().url("Invalid URL format").max(500, "Website URL must be less than 500 characters").trim().nullable().optional().or(z.literal("")),
  phone: z.string().max(20, "Phone number must be less than 20 characters").trim().nullable().optional(),
  latitude: z.string().nullable().optional(),
  longitude: z.string().nullable().optional(),
  featureIds: z.array(z.number()).nullable().optional(),
  live: z.boolean().nullable().optional(),
});

export const insertFeatureSchema = z.object({
  name: z.string(),
});

export const insertEventSchema = z.object({
  bookshopId: z.number(),
  title: z.string(),
  description: z.string(),
  date: z.string(),
  time: z.string(),
});

export type InsertBookstore = z.infer<typeof insertBookstoreSchema>;
export type InsertFeature = z.infer<typeof insertFeatureSchema>;
export type InsertEvent = z.infer<typeof insertEventSchema>;
