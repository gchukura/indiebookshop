// State abbreviation to full name mapping
export const stateMap: {[key: string]: string} = {
  'AL': 'Alabama', 
  'AK': 'Alaska', 
  'AZ': 'Arizona', 
  'AR': 'Arkansas', 
  'CA': 'California', 
  'CO': 'Colorado', 
  'CT': 'Connecticut', 
  'DE': 'Delaware', 
  'DC': 'District of Columbia', 
  'FL': 'Florida', 
  'GA': 'Georgia', 
  'HI': 'Hawaii', 
  'ID': 'Idaho', 
  'IL': 'Illinois', 
  'IN': 'Indiana', 
  'IA': 'Iowa', 
  'KS': 'Kansas', 
  'KY': 'Kentucky', 
  'LA': 'Louisiana', 
  'ME': 'Maine', 
  'MD': 'Maryland', 
  'MA': 'Massachusetts', 
  'MI': 'Michigan', 
  'MN': 'Minnesota', 
  'MS': 'Mississippi', 
  'MO': 'Missouri', 
  'MT': 'Montana', 
  'NE': 'Nebraska', 
  'NV': 'Nevada', 
  'NH': 'New Hampshire', 
  'NJ': 'New Jersey', 
  'NM': 'New Mexico', 
  'NY': 'New York', 
  'NC': 'North Carolina', 
  'ND': 'North Dakota', 
  'OH': 'Ohio', 
  'OK': 'Oklahoma', 
  'OR': 'Oregon', 
  'PA': 'Pennsylvania', 
  'RI': 'Rhode Island', 
  'SC': 'South Carolina', 
  'SD': 'South Dakota', 
  'TN': 'Tennessee', 
  'TX': 'Texas', 
  'UT': 'Utah', 
  'VT': 'Vermont', 
  'VA': 'Virginia', 
  'WA': 'Washington', 
  'WV': 'West Virginia', 
  'WI': 'Wisconsin', 
  'WY': 'Wyoming',
  
  // Canadian provinces
  'BC': 'British Columbia', 
  'ON': 'Ontario', 
  'QC': 'Quebec',
  'AB': 'Alberta', 
  'MB': 'Manitoba', 
  'NS': 'Nova Scotia',
  'NB': 'New Brunswick', 
  'SK': 'Saskatchewan',
  
  // Other territories and regions
  'HM': 'Heard and McDonald Islands',
  'VI': 'Virgin Islands',
  'PR': 'Puerto Rico',
  'GU': 'Guam',
  'AS': 'American Samoa',
  'MP': 'Northern Mariana Islands'
};

// Build the reverse mapping (full name to abbreviation)
export const stateNameMap: {[key: string]: string} = Object.entries(stateMap).reduce(
  (acc, [abbr, name]) => {
    acc[name.toLowerCase()] = abbr;
    return acc;
  }, 
  {} as {[key: string]: string}
);

/**
 * Get the full state name from the abbreviation
 * @param abbreviation - The state abbreviation (e.g., "CA")
 * @returns The full state name (e.g., "California") or the original value if not found
 */
export function getFullStateName(abbreviation: string | null | undefined): string {
  if (!abbreviation) return '';
  return stateMap[abbreviation.toUpperCase()] || abbreviation;
}

/**
 * Get the state abbreviation from the full name
 * @param stateName - The full state name (e.g., "California")
 * @returns The state abbreviation (e.g., "CA") or null if not found
 */
export function getStateAbbreviation(stateName: string | null | undefined): string | null {
  if (!stateName) return null;
  
  // If it's already an abbreviation (2 characters), return it
  if (stateName.length === 2) {
    return stateName.toUpperCase();
  }
  
  // Check if we have a mapping for this state name
  const abbr = stateNameMap[stateName.toLowerCase()];
  return abbr || null;
}

/**
 * Generate a slug from a state name
 * @param stateName - The state name to slugify
 * @returns A URL-friendly slug 
 */
export function generateStateSlug(stateName: string): string {
  return stateName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * Normalize a state input to its uppercase abbreviation
 * Handles both full names (e.g., "Michigan", "michigan", "MICHIGAN") 
 * and abbreviations (e.g., "MI", "mi", "Mi")
 * @param stateInput - The state input (can be full name or abbreviation, any case)
 * @returns The uppercase abbreviation (e.g., "MI") or null if not found
 */
export function normalizeStateToAbbreviation(stateInput: string | null | undefined): string | null {
  if (!stateInput || typeof stateInput !== 'string') return null;
  
  const trimmed = stateInput.trim();
  if (!trimmed) return null;
  
  // If it's already a 2-character abbreviation, normalize to uppercase
  if (trimmed.length === 2) {
    return trimmed.toUpperCase();
  }
  
  // Try to find the abbreviation from the full name
  const normalizedName = trimmed.toLowerCase();
  const abbreviation = stateNameMap[normalizedName];
  
  if (abbreviation) {
    return abbreviation;
  }
  
  // If not found, try uppercase version (for edge cases)
  return stateMap[trimmed.toUpperCase()] ? trimmed.toUpperCase() : null;
}

/**
 * Check if two state values match (fuzzy matching)
 * Handles abbreviations, full names, and case variations
 * @param state1 - First state value (can be abbreviation or full name, any case)
 * @param state2 - Second state value (can be abbreviation or full name, any case)
 * @returns true if the states match, false otherwise
 */
export function statesMatch(state1: string | null | undefined, state2: string | null | undefined): boolean {
  if (!state1 || !state2) return false;
  
  const abbr1 = normalizeStateToAbbreviation(state1);
  const abbr2 = normalizeStateToAbbreviation(state2);
  
  if (!abbr1 || !abbr2) {
    // Fallback to case-insensitive string comparison
    return state1.toUpperCase() === state2.toUpperCase();
  }
  
  return abbr1 === abbr2;
}