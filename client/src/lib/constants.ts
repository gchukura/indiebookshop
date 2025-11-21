// Map colors and styling constants are defined in COLORS below

// Color theme constants
export const COLORS = {
  primary: "#5F4B32",    // Brown
  secondary: "#2A6B7C",  // Teal
  accent: "#E16D3D",     // Orange
  cream: "#F7F3E8",      // Light cream background
  dark: "#333333",       // Dark text
};

// Feature constants
export const FEATURES = [
  { id: 1, name: "Events" },
  { id: 2, name: "Café" },
  { id: 3, name: "Used Books" },
  { id: 4, name: "Rare Books" },
  { id: 5, name: "Children's Books" },
  { id: 6, name: "Local Authors" },
  { id: 7, name: "Art Books" },
  { id: 8, name: "Book Club" },
];

// States with bookstores
export const STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", 
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", 
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", 
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", 
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", 
  "New Hampshire", "New Jersey", "New Mexico", "New York", 
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", 
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", 
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", 
  "West Virginia", "Wisconsin", "Wyoming"
];

// Title and descriptions for SEO
export const SEO = {
  home: {
    title: "IndiebookShop - Discover Independent Bookstores",
    description: "Explore unique independent bookshops across the United States and find your next literary haven with IndiebookShop's comprehensive directory."
  },
  directory: {
    title: "Bookstore Directory | IndiebookShop",
    description: "Browse our comprehensive directory of independent bookstores across the United States. Filter by location, features, and more."
  },
  bookstoreDetail: {
    titleTemplate: "%s | IndiebookShop",
    descriptionTemplate: "Visit %s in %s, %s. Find hours, events, and more information about this independent bookstore."
  }
};

// Map constants
export const MAP = {
  // Geographic center of the United States (latitude, longitude)
  // Used as default map center when no bookshops are available
  US_CENTER: {
    lat: 39.8283,
    lng: -98.5795,
  },
  // Mapbox format: [longitude, latitude]
  US_CENTER_MAPBOX: [-98.5795, 39.8283] as [number, number],
  // Google Maps format: { lat, lng }
  US_CENTER_GOOGLE: {
    lat: 39.8283,
    lng: -98.5795,
  },
} as const;

// React Query constants
export const QUERY = {
  // Default stale time: 5 minutes (in milliseconds)
  DEFAULT_STALE_TIME: 5 * 60 * 1000,
  // Cache time: 10 minutes (in milliseconds)
  DEFAULT_CACHE_TIME: 10 * 60 * 1000,
} as const;

// Pagination constants
export const PAGINATION = {
  // Default items per page for directory listings
  DEFAULT_ITEMS_PER_PAGE: 50,
  // Large items per page for directory listings
  LARGE_ITEMS_PER_PAGE: 150,
} as const;
