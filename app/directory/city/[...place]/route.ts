import { legacyCityPath, permanentRedirectTo } from '@/lib/data/legacy-location-redirect';

/** Old /directory/city/CA/Berkeley and /directory/city/Berkeley links → /bookshops/california/berkeley. */
export async function GET(request: Request, { params }: { params: Promise<{ place: string[] }> }) {
  const { place } = await params;
  const path = place.length >= 2 ? await legacyCityPath(place[1], place[0]) : await legacyCityPath(place[0]);
  return permanentRedirectTo(request, path);
}
