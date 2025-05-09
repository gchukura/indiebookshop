// Google Maps API key - in a production app, this would be an environment variable
export const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || "AIzaSyBNLrJhOMz6idD05pzwk17mcUoQcCyJbfc";

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
