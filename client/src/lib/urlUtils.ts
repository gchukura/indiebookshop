/**
 * Utility functions for SEO-friendly URL handling
 */
import { Bookstore } from "@shared/schema";

// State abbreviation to full name mapping
export const stateAbbreviationToName: Record<string, string> = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 
  'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 
  'DE': 'Delaware', 'DC': 'District-of-Columbia', 'FL': 'Florida', 
  'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 
  'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas', 'KY': 'Kentucky', 
  'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland', 
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 
  'MS': 'Mississippi', 'MO': 'Missouri', 'MT': 'Montana', 
  'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New-Hampshire', 
  'NJ': 'New-Jersey', 'NM': 'New-Mexico', 'NY': 'New-York', 
  'NC': 'North-Carolina', 'ND': 'North-Dakota', 'OH': 'Ohio', 
  'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 
  'RI': 'Rhode-Island', 'SC': 'South-Carolina', 'SD': 'South-Dakota', 
  'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont', 
  'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West-Virginia', 
  'WI': 'Wisconsin', 'WY': 'Wyoming',
  // Include Canadian provinces as they appear in the data
  'BC': 'British-Columbia', 'ON': 'Ontario', 'QC': 'Quebec',
  'AB': 'Alberta', 'MB': 'Manitoba', 'NS': 'Nova-Scotia',
  'NB': 'New-Brunswick', 'SK': 'Saskatchewan',
  // Include other territories and regions
  'HM': 'Heard-and-McDonald-Islands',
  'VI': 'Virgin-Islands',
};

// Full state name to abbreviation mapping
export const stateNameToAbbreviation: Record<string, string> = 
  Object.entries(stateAbbreviationToName).reduce((acc, [abbr, name]) => {
    // Convert to lowercase and replace spaces with dashes for URL matching
    const urlName = name.toLowerCase();
    acc[urlName] = abbr;
    return acc;
  }, {} as Record<string, string>);

/**
 * Create a slug from a string by removing special characters and replacing spaces with dashes
 */
export function createSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with dashes
    .replace(/-+/g, '-')      // Replace multiple dashes with a single dash
    .trim();
}

/**
 * Get the full state name from an abbreviation
 */
export function getStateNameFromAbbreviation(abbr: string): string {
  return stateAbbreviationToName[abbr] || abbr;
}

/**
 * Get the state abbreviation from a full name
 */
export function getStateAbbreviationFromName(name: string): string | null {
  const normalizedName = name.toLowerCase().replace(/\s+/g, '-');
  return stateNameToAbbreviation[normalizedName] || null;
}

/**
 * Create a bookshop URL with the format /bookshop/{state}/{city}/{name}
 */
export function createBookshopUrl(bookshop: Bookstore): string {
  const stateSlug = createSlug(getStateNameFromAbbreviation(bookshop.state));
  const citySlug = createSlug(bookshop.city);
  const nameSlug = createSlug(bookshop.name);
  
  return `/bookshop/${stateSlug}/${citySlug}/${nameSlug}/${bookshop.id}`;
}

/**
 * Create a bookshop URL with the abbreviated state format (for legacy support)
 */
export function createBookshopUrlWithStateAbbreviation(bookshop: Bookstore): string {
  const citySlug = createSlug(bookshop.city);
  const nameSlug = createSlug(bookshop.name);
  
  return `/bookshop/${bookshop.state}/${citySlug}/${nameSlug}/${bookshop.id}`;
}

/**
 * Create a state directory URL
 */
export function createStateDirectoryUrl(stateAbbr: string): string {
  const stateName = getStateNameFromAbbreviation(stateAbbr);
  const stateSlug = createSlug(stateName);
  
  return `/bookshops/${stateSlug}`;
}

/**
 * Create a city directory URL
 */
export function createCityDirectoryUrl(stateAbbr: string, city: string): string {
  const stateName = getStateNameFromAbbreviation(stateAbbr);
  const stateSlug = createSlug(stateName);
  const citySlug = createSlug(city);
  
  return `/bookshops/${stateSlug}/${citySlug}`;
}

/**
 * Create a category directory URL
 */
export function createCategoryDirectoryUrl(categoryName: string, categoryId: number): string {
  const categorySlug = createSlug(categoryName);
  
  return `/bookshops/category/${categorySlug}/${categoryId}`;
}

/**
 * Extract ID from a bookshop URL path
 */
export function extractBookshopIdFromPath(path: string): number | null {
  const parts = path.split('/');
  const lastPart = parts[parts.length - 1];
  
  // Check if the last part is a number
  const id = parseInt(lastPart);
  return isNaN(id) ? null : id;
}