// Serverless-compatible Schema definitions
// This file provides basic type information for the serverless environment

// User types
export const insertUserSchema = {
  username: String,
  email: String,
  password: String
};

// Bookstore types 
export const insertBookstoreSchema = {
  name: String,
  street: String,
  city: String,
  state: String,
  zip: String,
  description: String,
  imageUrl: String,
  website: String,
  phone: String,
  hours: Object,
  latitude: String,
  longitude: String,
  featureIds: Array,
  live: Boolean
};

// Feature types
export const insertFeatureSchema = {
  name: String
};

// Event types
export const insertEventSchema = {
  bookshopId: Number,
  title: String,
  description: String,
  date: String,
  time: String
};

// Filter schemas
export const bookstoreFiltersSchema = {
  state: String,
  city: String,
  featureIds: Array
};

// Export placeholder functions to simulate zod validation
export function z() {
  return {
    object: () => ({
      parse: (data) => data,
      safeParse: (data) => ({ success: true, data })
    })
  };
}

export function createInsertSchema(table) {
  return {
    pick: () => ({
      parse: (data) => data
    }),
    omit: () => ({
      parse: (data) => data
    })
  };
}