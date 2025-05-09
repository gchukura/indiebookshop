// Import types from shared schema
import { Bookstore, Feature, Event, User } from "@shared/schema";

// Additional frontend-specific types

export interface SearchParams {
  state?: string;
  city?: string;
  features?: string;
  view?: "map" | "list";
  search?: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

export interface FilterState {
  state: string;
  city: string;
  featureIds: number[];
  searchQuery: string;
}

export interface MapViewPosition {
  lat: number;
  lng: number;
  zoom: number;
}

export interface FavoriteBookstore {
  id: number;
  userId: number;
  bookstoreId: number;
  createdAt: string;
}

// Re-export types from shared schema for convenience
export type { Bookstore, Feature, Event, User };
