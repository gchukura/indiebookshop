// SEO constants and utility functions

// Base URL for canonical links
export const BASE_URL = 'https://indiebookshop.com';

// Main keywords for SEO - general keywords without location specifics
export const MAIN_KEYWORDS = [
  'Local bookshops',
  'Indie bookshops',
  'Independent bookshops',
  'Bookshops in America',
  'Bookshops in north america',
  'Best bookshops',
  'List of bookshops',
  'Vintage bookshops',
  'Alternative bookshops'
];

// Location-specific keyword patterns
export const LOCATION_KEYWORD_PATTERNS = [
  // Local bookshops patterns
  '{city} Local bookshops',
  '{state} Local bookshops',
  '{city} {state} Local bookshops',
  'Local bookshops {city}',
  'Local bookshops {state}',
  'Local bookshops {city} {state}',
  'Local bookshops in {city}',
  'Local bookshops in {state}',
  'Local bookshops in {city} {state}',
  'Local bookshops near me {city}',
  'Local bookshops near me {state}',
  'Local bookshops near me {city} {state}',
  
  // Indie bookshops patterns
  '{city} Indie bookshops',
  '{state} Indie bookshops',
  '{city} {state} Indie bookshops',
  'Indie bookshops {city}',
  'Indie bookshops {state}',
  'Indie bookshops {city} {state}',
  'Indie bookshops in {city}',
  'Indie bookshops in {state}',
  'Indie bookshops in {city} {state}',
  'Indie bookshops near me {city}',
  'Indie bookshops near me {state}',
  'Indie bookshops near me {city} {state}',
  
  // Independent bookshops patterns
  '{city} Independent bookshops',
  '{state} Independent bookshops',
  '{city} {state} Independent bookshops',
  'Independent bookshops {city}',
  'Independent bookshops {state}',
  'Independent bookshops {city} {state}',
  'Independent bookshops in {city}',
  'Independent bookshops in {state}',
  'Independent bookshops in {city} {state}',
  'Independent bookshops near me {city}',
  'Independent bookshops near me {state}',
  'Independent bookshops near me {city} {state}',
  
  // Best bookshops patterns
  'Best bookshops {city}',
  'Best bookshops {state}',
  'Best bookshops {city} {state}',
  'Best bookshops in {city}',
  'Best bookshops in {state}',
  'Best bookshops in {city} {state}',
  'Best bookshops near me {city}',
  'Best bookshops near me {state}',
  'Best bookshops near me {city} {state}',
  
  // List of bookshops patterns
  'List of bookshops by {city}',
  'List of bookshops by {state}',
  'List of bookshops by {city} {state}',
  'List of bookshops in {city}',
  'List of bookshops in {state}',
  'List of bookshops in {city} {state}',
  'List of bookshops near me {city}',
  'List of bookshops near me {state}',
  'List of bookshops near me {city} {state}',
  
  // Vintage bookshops patterns
  '{city} Vintage bookshops',
  '{state} Vintage bookshops',
  '{city} {state} Vintage bookshops',
  'Vintage bookshops {city}',
  'Vintage bookshops {state}',
  'Vintage bookshops {city} {state}',
  'Vintage bookshops in {city}',
  'Vintage bookshops in {state}',
  'Vintage bookshops in {city} {state}',
  'Vintage bookshops near me {city}',
  'Vintage bookshops near me {state}',
  'Vintage bookshops near me {city} {state}',
  'Best vintage bookshops {city}',
  'Best vintage bookshops {state}',
  'Best vintage bookshops {city} {state}',
  
  // Alternative bookshops patterns
  '{city} Alternative bookshops',
  '{state} Alternative bookshops',
  '{city} {state} Alternative bookshops',
  'Alternative bookshops {city}',
  'Alternative bookshops {state}',
  'Alternative bookshops {city} {state}',
  'Alternative bookshops in {city}',
  'Alternative bookshops in {state}',
  'Alternative bookshops in {city} {state}',
  'Alternative bookshops near me {city}',
  'Alternative bookshops near me {state}',
  'Alternative bookshops near me {city} {state}',
  'Best alternative bookshops {city}',
  'Best alternative bookshops {state}',
  'Best alternative bookshops {city} {state}'
];

// Keyword recommendations per page
interface KeywordRecommendations {
  [key: string]: {
    mainKeyword: string;
    additionalKeywords: string[];
    recommendedDensity: number; // percentage (1-5% is generally recommended)
  };
}

export const PAGE_KEYWORDS: KeywordRecommendations = {
  home: {
    mainKeyword: 'Independent bookshops',
    additionalKeywords: [
      'Indie bookshops', 
      'Local bookshops', 
      'Bookshops in America',
      'Best bookshops',
      'List of bookshops'
    ],
    recommendedDensity: 2,
  },
  about: {
    mainKeyword: 'About IndieBookShop',
    additionalKeywords: [
      'Support indie bookshops',
      'Independent bookstore mission',
      'Bookshop directory',
      'Local bookstore community',
      'Indie bookshop advocacy'
    ],
    recommendedDensity: 2,
  },
  states: {
    mainKeyword: 'Bookshops by state',
    additionalKeywords: [
      '{state} Local bookshops', 
      '{state} Indie bookshops', 
      '{state} Independent bookshops',
      'List of bookshops by {state}',
      'Independent bookshops in {state}'
    ],
    recommendedDensity: 2,
  },
  cities: {
    mainKeyword: 'Bookshops by city',
    additionalKeywords: [
      '{city} Local bookshops', 
      '{city} Indie bookshops', 
      '{city} Independent bookshops',
      'List of bookshops in {city}',
      'Independent bookshops in {city}'
    ],
    recommendedDensity: 2,
  },
  city_state: {
    mainKeyword: 'Bookshops in {city} {state}',
    additionalKeywords: [
      '{city} {state} Local bookshops', 
      '{city} {state} Indie bookshops', 
      '{city} {state} Independent bookshops',
      'Best bookshops in {city} {state}',
      'List of bookshops in {city} {state}'
    ],
    recommendedDensity: 2,
  },
  categories: {
    mainKeyword: 'Bookshop specialties',
    additionalKeywords: [
      'Types of bookshops', 
      'Specialized bookshops', 
      'Vintage bookshops',
      'Alternative bookshops',
      'Best bookshops by category'
    ],
    recommendedDensity: 2,
  },
  vintage: {
    mainKeyword: 'Vintage bookshops',
    additionalKeywords: [
      'Vintage bookshops in America', 
      'Best vintage bookshops', 
      'List of vintage bookshops',
      'Vintage bookshops near me'
    ],
    recommendedDensity: 2,
  },
  alternative: {
    mainKeyword: 'Alternative bookshops',
    additionalKeywords: [
      'Alternative bookshops in America', 
      'Best alternative bookshops', 
      'List of alternative bookshops',
      'Alternative bookshops near me'
    ],
    recommendedDensity: 2,
  },
  events: {
    mainKeyword: 'Bookshop events',
    additionalKeywords: [
      'Author events', 
      'Book signings', 
      'Literary events',
      'Events at indie bookshops',
      'Independent bookshop events'
    ],
    recommendedDensity: 2,
  },
  near_me: {
    mainKeyword: 'Bookshops near me',
    additionalKeywords: [
      'Local bookshops near me', 
      'Indie bookshops near me', 
      'Independent bookshops near me',
      'Best bookshops near me'
    ],
    recommendedDensity: 2,
  }
};

// Description templates
export const DESCRIPTION_TEMPLATES = {
  home: 'Find local bookshops, indie bookshops, and independent bookshops across America. Browse our comprehensive directory of the best bookshops and discover unique literary destinations.',
  
  about: 'Learn about IndieBookShop.com and our mission to support independent bookshops across America. Discover how we connect readers with local indie bookstores through our comprehensive directory.',
  
  states: 'Browse {state} local bookshops and indie bookshops. Find independent bookshops in {state} with our complete directory of the best bookshops across the state.',
  
  cities: 'Discover {city} local bookshops and indie bookshops. Find independent bookshops in {city} with our comprehensive list of the best bookshops in the area.',
  
  city_state: 'Explore local bookshops in {city}, {state}. Find indie bookshops and independent bookshops in {city} {state} with our complete directory of the best bookshops in the area.',
  
  county: 'Discover local bookshops in {county} County. Find indie bookshops and independent bookshops in {county} County with our comprehensive directory of the best bookshops in the area.',
  
  county_state: 'Browse local bookshops in {county} County, {state}. Find indie bookshops and independent bookshops in {county} County, {state} with our comprehensive directory.',
  
  categories: 'Browse bookshops by category. Find specialized indie bookshops including vintage bookshops, alternative bookshops, and other unique independent bookshops across America.',
  
  vintage: 'Discover vintage bookshops across America. Find the best vintage bookshops with our complete directory of rare and antiquarian bookshops specializing in collectible volumes.',
  
  alternative: 'Explore alternative bookshops across America. Find the best alternative bookshops with our comprehensive list of indie and independent specialty book retailers.',
  
  events: 'Discover upcoming events at local bookshops and indie bookshops. Find author readings, book signings, and literary events at independent bookshops near you.',
  
  near_me: 'Find local bookshops near me, indie bookshops near me, and the best independent bookshops in your area with our comprehensive bookshop directory.',
  
  detail: '{name} is an independent bookshop in {city}, {state}. Discover events, specialty offerings, and more information about this local bookshop at IndiebookShop.com.',
};

// Helper to generate a permalink-friendly string
export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-'); // Remove consecutive hyphens
};

// Helper to calculate keyword density in content
export const calculateKeywordDensity = (content: string, keyword: string): number => {
  const totalWords = content.split(/\s+/).length;
  const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'gi');
  const keywordCount = (content.match(keywordRegex) || []).length;
  
  return totalWords > 0 ? (keywordCount / totalWords) * 100 : 0;
};

// Helper to get a recommended number of keyword occurrences
export const getRecommendedOccurrences = (totalWords: number, keyword: string, targetDensity: number = 2): number => {
  // For a typical page, aim for 1-3% keyword density
  return Math.round((targetDensity / 100) * totalWords);
};

// Helper to generate meta descriptions with keywords
export const generateDescription = (template: string, replacements: Record<string, string>): string => {
  let description = template;
  
  Object.entries(replacements).forEach(([key, value]) => {
    const regex = new RegExp(`{${key}}`, 'g');
    description = description.replace(regex, value);
  });
  
  return description;
};

// Helper to generate location-specific keywords
export const generateLocationKeywords = (
  city: string, 
  state: string, 
  keywordType: 'local' | 'indie' | 'independent' | 'vintage' | 'alternative' | 'best' | 'all' = 'all',
  limit: number = 10
): string[] => {
  if (!city && !state) {
    return MAIN_KEYWORDS.slice(0, limit);
  }
  
  // Filter patterns based on keyword type
  let patternsToUse = LOCATION_KEYWORD_PATTERNS;
  if (keywordType !== 'all') {
    const keywordMap = {
      'local': 'Local bookshops',
      'indie': 'Indie bookshops',
      'independent': 'Independent bookshops',
      'vintage': 'Vintage bookshops',
      'alternative': 'Alternative bookshops',
      'best': 'Best bookshops'
    };
    
    const term = keywordMap[keywordType];
    patternsToUse = LOCATION_KEYWORD_PATTERNS.filter(pattern => 
      pattern.includes(term) || pattern.toLowerCase().includes(term.toLowerCase())
    );
  }
  
  // Replace placeholders with actual values
  const keywords = patternsToUse.map(pattern => {
    let keyword = pattern;
    if (city) {
      keyword = keyword.replace(/\{city\}/g, city);
    }
    if (state) {
      keyword = keyword.replace(/\{state\}/g, state);
    }
    
    // Remove any remaining placeholders
    if (keyword.includes('{city}') || keyword.includes('{state}')) {
      return null;
    }
    
    return keyword;
  }).filter(Boolean) as string[];
  
  // Add some general keywords
  const generalKeywords = [
    'Local bookshops',
    'Indie bookshops',
    'Independent bookshops',
    'Best bookshops'
  ];
  
  // Combine and limit
  return [...keywords, ...generalKeywords].slice(0, limit);
};