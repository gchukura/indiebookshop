/**
 * IANA time zone for a US shop, from its state — with county exceptions for
 * states split across zones. Returns null when the zone can't be told
 * reliably (then pages show hours without an open/closed state).
 */

import { getStateAbbrev } from '@/lib/state-utils';

const STATE_ZONES: Record<string, string> = {
  AL: 'America/Chicago', AK: 'America/Anchorage', AZ: 'America/Phoenix', AR: 'America/Chicago',
  CA: 'America/Los_Angeles', CO: 'America/Denver', CT: 'America/New_York', DE: 'America/New_York',
  DC: 'America/New_York', FL: 'America/New_York', GA: 'America/New_York', HI: 'Pacific/Honolulu',
  ID: 'America/Boise', IL: 'America/Chicago', IN: 'America/Indiana/Indianapolis', IA: 'America/Chicago',
  KS: 'America/Chicago', LA: 'America/Chicago', ME: 'America/New_York', MD: 'America/New_York',
  MA: 'America/New_York', MI: 'America/Detroit', MN: 'America/Chicago', MS: 'America/Chicago',
  MO: 'America/Chicago', MT: 'America/Denver', NE: 'America/Chicago', NV: 'America/Los_Angeles',
  NH: 'America/New_York', NJ: 'America/New_York', NM: 'America/Denver', NY: 'America/New_York',
  NC: 'America/New_York', ND: 'America/Chicago', OH: 'America/New_York', OK: 'America/Chicago',
  OR: 'America/Los_Angeles', PA: 'America/New_York', RI: 'America/New_York', SC: 'America/New_York',
  SD: 'America/Chicago', TN: 'America/Chicago', TX: 'America/Chicago', UT: 'America/Denver',
  VT: 'America/New_York', VA: 'America/New_York', WA: 'America/Los_Angeles', WV: 'America/New_York',
  WI: 'America/Chicago', WY: 'America/Denver',
};

/** Counties in the state's other zone. */
const COUNTY_EXCEPTIONS: Record<string, { zone: string; counties: string[] }> = {
  FL: { zone: 'America/Chicago', counties: ['Escambia', 'Santa Rosa', 'Okaloosa', 'Walton', 'Holmes', 'Washington', 'Bay', 'Jackson', 'Calhoun', 'Gulf'] },
  ID: { zone: 'America/Los_Angeles', counties: ['Boundary', 'Bonner', 'Kootenai', 'Shoshone', 'Benewah', 'Latah', 'Clearwater', 'Nez Perce', 'Lewis', 'Idaho'] },
  IN: { zone: 'America/Chicago', counties: ['Lake', 'Porter', 'LaPorte', 'La Porte', 'Jasper', 'Newton', 'Starke', 'Gibson', 'Posey', 'Vanderburgh', 'Warrick', 'Spencer', 'Perry'] },
  KS: { zone: 'America/Denver', counties: ['Sherman', 'Wallace', 'Greeley', 'Hamilton'] },
  MI: { zone: 'America/Chicago', counties: ['Gogebic', 'Iron', 'Dickinson', 'Menominee'] },
  NE: { zone: 'America/Denver', counties: ['Sioux', 'Dawes', 'Sheridan', 'Box Butte', 'Scotts Bluff', 'Morrill', 'Garden', 'Banner', 'Kimball', 'Cheyenne', 'Deuel', 'Keith', 'Perkins', 'Chase', 'Dundy', 'Grant', 'Arthur', 'Hooker'] },
  ND: { zone: 'America/Denver', counties: ['Adams', 'Billings', 'Bowman', 'Golden Valley', 'Grant', 'Hettinger', 'Slope', 'Stark'] },
  OR: { zone: 'America/Boise', counties: ['Malheur'] },
  SD: { zone: 'America/Denver', counties: ['Bennett', 'Butte', 'Corson', 'Custer', 'Dewey', 'Fall River', 'Haakon', 'Harding', 'Jackson', 'Lawrence', 'Meade', 'Oglala Lakota', 'Shannon', 'Pennington', 'Perkins', 'Stanley', 'Ziebach'] },
  TN: { zone: 'America/New_York', counties: ['Anderson', 'Bledsoe', 'Blount', 'Bradley', 'Campbell', 'Carter', 'Claiborne', 'Cocke', 'Grainger', 'Greene', 'Hamblen', 'Hamilton', 'Hancock', 'Hawkins', 'Jefferson', 'Johnson', 'Knox', 'Loudon', 'McMinn', 'Meigs', 'Monroe', 'Morgan', 'Polk', 'Rhea', 'Roane', 'Scott', 'Sevier', 'Sullivan', 'Unicoi', 'Union', 'Washington'] },
  TX: { zone: 'America/Denver', counties: ['El Paso', 'Hudspeth'] },
};

/** Kentucky splits along no county list we keep; use longitude, and give up near the line. */
function kentuckyZone(lng: number | null): string | null {
  if (lng === null) return null;
  if (lng <= -86.4) return 'America/Chicago';
  if (lng >= -85.4) return 'America/New_York';
  return null;
}

const normalizeCounty = (county: string) => county.trim().replace(/\s+(county|parish|borough)$/i, '').toLowerCase();

export function shopTimeZone(state: string, county?: string | null, longitude?: string | null): string | null {
  const abbrev = getStateAbbrev(state);
  const lng = longitude ? parseFloat(longitude) : NaN;
  if (abbrev === 'KY') return kentuckyZone(Number.isFinite(lng) ? lng : null);
  const exception = COUNTY_EXCEPTIONS[abbrev];
  if (exception && county) {
    const c = normalizeCounty(county);
    if (exception.counties.some(name => name.toLowerCase() === c)) return exception.zone;
  }
  return STATE_ZONES[abbrev] ?? null;
}
