// SEO constants and utility functions

// Base URL for canonical links
export const BASE_URL = 'https://indiebookshop.com';

// Main keywords for SEO
export const MAIN_KEYWORDS = [
  'independent bookstores',
  'indie bookshops',
  'local bookshops',
  'indie booksellers',
  'bookshop directory',
  'bookstore finder',
  'indie bookstore near me',
  'independent bookshop events',
  'local author events',
  'rare book stores',
  'cozy bookshops',
  'bookstore cafe'
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
    mainKeyword: 'independent bookstores',
    additionalKeywords: [
      'indie bookshops', 
      'bookstore finder', 
      'local bookshops'
    ],
    recommendedDensity: 2,
  },
  states: {
    mainKeyword: 'bookstores by state',
    additionalKeywords: [
      'independent bookstores by state', 
      'find bookshops by state', 
      'state bookstore directory'
    ],
    recommendedDensity: 2,
  },
  cities: {
    mainKeyword: 'bookstores by city',
    additionalKeywords: [
      'indie bookshops in city', 
      'city bookstore finder', 
      'local bookshops by city'
    ],
    recommendedDensity: 2,
  },
  categories: {
    mainKeyword: 'bookstore categories',
    additionalKeywords: [
      'bookshop specialties', 
      'types of bookstores', 
      'specialized bookshops'
    ],
    recommendedDensity: 2,
  },
  events: {
    mainKeyword: 'bookstore events',
    additionalKeywords: [
      'author events', 
      'book signings', 
      'bookshop readings', 
      'indie bookstore calendar'
    ],
    recommendedDensity: 2,
  }
};

// Description templates
export const DESCRIPTION_TEMPLATES = {
  home: 'Find independent bookstores and indie bookshops across the country. Browse our directory of local bookshops, discover events, and connect with passionate indie booksellers.',
  states: 'Browse independent bookstores by state. Find local bookshops across {state} and discover unique indie booksellers in your area.',
  cities: 'Discover independent bookshops in {city}. Find local indie bookstores, book events, and literary gatherings in {city}.',
  categories: 'Browse bookstores by category. Find indie bookshops with {category} and discover specialized independent bookstores that match your interests.',
  events: 'Discover upcoming events at independent bookstores. Find author readings, book signings, and literary events at indie bookshops near you.',
  detail: '{name} is an independent bookstore in {city}, {state}. Discover their unique offerings, events, and more at IndiebookShop.com.',
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
    description = description.replace(`{${key}}`, value);
  });
  
  return description;
};