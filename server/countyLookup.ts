/**
 * County Lookup Service
 * 
 * This module provides functions to determine and populate county information
 * for bookshops based on available address data (city and state).
 */
import { Bookstore } from '../shared/schema';

// Pre-populated county data mapping (state => city => county)
// This includes popular cities and those likely to have bookshops
const COUNTY_MAPPING: Record<string, Record<string, string>> = {
  'CA': {
    'Los Angeles': 'Los Angeles',
    'San Francisco': 'San Francisco',
    'San Diego': 'San Diego',
    'Oakland': 'Alameda',
    'Berkeley': 'Alameda',
    'Palo Alto': 'Santa Clara',
    'San Jose': 'Santa Clara',
    'Sacramento': 'Sacramento',
    'Fresno': 'Fresno',
    'Long Beach': 'Los Angeles',
    'Santa Monica': 'Los Angeles',
    'Pasadena': 'Los Angeles',
    'Santa Barbara': 'Santa Barbara',
    'San Luis Obispo': 'San Luis Obispo',
    'Santa Cruz': 'Santa Cruz',
    'Monterey': 'Monterey',
    'Napa': 'Napa',
    'Sonoma': 'Sonoma',
    'Carmel': 'Monterey',
    'Malibu': 'Los Angeles'
  },
  'NY': {
    'New York': 'New York',
    'Brooklyn': 'Kings',
    'Buffalo': 'Erie',
    'Rochester': 'Monroe',
    'Syracuse': 'Onondaga',
    'Albany': 'Albany',
    'Yonkers': 'Westchester',
    'White Plains': 'Westchester',
    'Ithaca': 'Tompkins',
    'Queens': 'Queens',
    'Bronx': 'Bronx',
    'Staten Island': 'Richmond',
    'Saratoga Springs': 'Saratoga',
    'Poughkeepsie': 'Dutchess',
    'Kingston': 'Ulster',
    'Hudson': 'Columbia',
    'Woodstock': 'Ulster',
    'Cold Spring': 'Putnam'
  },
  'MA': {
    'Boston': 'Suffolk',
    'Cambridge': 'Middlesex',
    'Worcester': 'Worcester',
    'Springfield': 'Hampden',
    'Lowell': 'Middlesex',
    'Somerville': 'Middlesex',
    'Amherst': 'Hampshire',
    'Northampton': 'Hampshire',
    'Salem': 'Essex',
    'Newburyport': 'Essex',
    'Gloucester': 'Essex',
    'Rockport': 'Essex',
    'Provincetown': 'Barnstable',
    'Concord': 'Middlesex',
    'Lexington': 'Middlesex',
    'Great Barrington': 'Berkshire',
    'Lenox': 'Berkshire',
    'Williamstown': 'Berkshire'
  },
  'ME': {
    'Portland': 'Cumberland',
    'Bangor': 'Penobscot',
    'Augusta': 'Kennebec',
    'Brunswick': 'Cumberland',
    'Bar Harbor': 'Hancock',
    'Camden': 'Knox',
    'Rockland': 'Knox',
    'Belfast': 'Waldo',
    'Damariscotta': 'Lincoln',
    'Boothbay Harbor': 'Lincoln'
  },
  'VT': {
    'Burlington': 'Chittenden',
    'Montpelier': 'Washington',
    'Brattleboro': 'Windham',
    'Woodstock': 'Windsor',
    'Manchester': 'Bennington',
    'Middlebury': 'Addison',
    'Stowe': 'Lamoille'
  },
  'NH': {
    'Portsmouth': 'Rockingham',
    'Hanover': 'Grafton',
    'Keene': 'Cheshire',
    'Concord': 'Merrimack',
    'Manchester': 'Hillsborough'
  },
  'CO': {
    'Denver': 'Denver',
    'Boulder': 'Boulder',
    'Fort Collins': 'Larimer',
    'Colorado Springs': 'El Paso',
    'Aspen': 'Pitkin',
    'Telluride': 'San Miguel',
    'Durango': 'La Plata'
  },
  'WA': {
    'Seattle': 'King',
    'Tacoma': 'Pierce',
    'Spokane': 'Spokane',
    'Bellingham': 'Whatcom',
    'Port Townsend': 'Jefferson',
    'Bainbridge Island': 'Kitsap',
    'Olympia': 'Thurston',
    'Walla Walla': 'Walla Walla'
  },
  'OR': {
    'Portland': 'Multnomah',
    'Eugene': 'Lane',
    'Bend': 'Deschutes',
    'Ashland': 'Jackson',
    'Hood River': 'Hood River',
    'Astoria': 'Clatsop',
    'Cannon Beach': 'Clatsop'
  },
  'MI': {
    'Ann Arbor': 'Washtenaw',
    'Detroit': 'Wayne',
    'Grand Rapids': 'Kent',
    'Traverse City': 'Grand Traverse',
    'Petoskey': 'Emmet',
    'Lansing': 'Ingham'
  },
  'IL': {
    'Chicago': 'Cook',
    'Evanston': 'Cook',
    'Oak Park': 'Cook',
    'Naperville': 'DuPage',
    'Champaign': 'Champaign',
    'Urbana': 'Champaign',
    'Springfield': 'Sangamon'
  }
};

/**
 * Lookup county information for a bookshop based on city and state
 */
export function lookupCounty(bookshop: Bookstore): string | null {
  const { city, state } = bookshop;
  
  // Skip lookup if city or state are missing
  if (!city || !state) return null;
  
  // Normalize city and state names
  const normalizedCity = city.trim();
  const normalizedState = state.trim();
  
  // Try to find the county from our mapping
  if (COUNTY_MAPPING[normalizedState] && COUNTY_MAPPING[normalizedState][normalizedCity]) {
    return COUNTY_MAPPING[normalizedState][normalizedCity];
  }
  
  return null;
}

/**
 * Fills in missing county data for bookshops that have city and state
 * but are missing county information.
 */
export function populateCountyData(bookshops: Bookstore[]): Bookstore[] {
  return bookshops.map(bookshop => {
    // Skip if the bookshop already has county data
    if (bookshop.county) return bookshop;
    
    // Attempt to look up county data
    const county = lookupCounty(bookshop);
    
    // Return updated bookshop with county information if available
    return county ? { ...bookshop, county } : bookshop;
  });
}