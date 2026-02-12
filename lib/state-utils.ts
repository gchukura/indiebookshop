/**
 * Shared state abbreviation / full-name helpers.
 * No server dependencies so safe to use in client components and server code.
 */

export const STATE_ABBREV_TO_FULL: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  DC: 'District of Columbia',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
};

const FULL_TO_ABBREV: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_ABBREV_TO_FULL).map(([abbr, full]) => [full.toLowerCase(), abbr])
);

/**
 * Normalize any state string to a canonical 2-letter abbreviation (US states).
 * Returns the abbreviation in uppercase, or the original trimmed if not found.
 */
export function getStateAbbrev(state: string | null | undefined): string {
  if (state == null || typeof state !== 'string') return '';
  const s = state.trim();
  if (!s) return '';
  if (s.length === 2) return s.toUpperCase();
  return FULL_TO_ABBREV[s.toLowerCase()] ?? s;
}

/**
 * Get display name for a state (full name from abbreviation).
 */
export function getStateDisplayName(abbrev: string | null | undefined): string {
  if (abbrev == null || typeof abbrev !== 'string') return '';
  const a = abbrev.trim().toUpperCase();
  if (a.length === 2) return STATE_ABBREV_TO_FULL[a] ?? abbrev;
  return STATE_ABBREV_TO_FULL[getStateAbbrev(abbrev)] ?? abbrev;
}
