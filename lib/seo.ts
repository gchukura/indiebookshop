/**
 * Page titles. Search results cut titles at ~60 characters, so each page
 * offers progressively shorter versions and the first that fits wins.
 */

export const BRAND = 'IndieBookShop';
export const MAX_TITLE_LENGTH = 60;

/** The first candidate within `max` characters, else the last one cut at a word boundary. */
export function fitTitle(candidates: string[], max = MAX_TITLE_LENGTH): string {
  const fits = candidates.find(c => c.length <= max);
  if (fits) return fits;
  const last = candidates[candidates.length - 1];
  const cut = last.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,|–-]+$/, '')}…`;
}

/**
 * Title for a list of shops in a place: "Independent Bookshops in Berkeley, California (12) | IndieBookShop",
 * shortened down to "Bookshops in Berkeley, CA (12)" when needed.
 * `placeShort` is the same place with a state abbreviation, e.g. "Berkeley, CA".
 */
export function placeTitle(place: string, placeShort: string, count: number, prefix = 'Independent Bookshops in'): string {
  const short = prefix.replace(/^Independent /, '');
  return fitTitle([
    `${prefix} ${place} (${count}) | ${BRAND}`,
    `${prefix} ${placeShort} (${count}) | ${BRAND}`,
    `${short} ${placeShort} (${count}) | ${BRAND}`,
    `${short} ${placeShort} (${count})`,
  ]);
}

/**
 * The site-wide share image (app/opengraph-image.tsx). Pages that set their own
 * `openGraph` replace the inherited image, so general pages pass this explicitly;
 * pages with their own opengraph-image.tsx don't need it.
 */
export const DEFAULT_OG_IMAGE = { url: '/opengraph-image', width: 1200, height: 630, alt: 'IndieBookShop — find your next independent bookshop' };
