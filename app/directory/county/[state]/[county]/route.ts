import { legacyCountyPath, permanentRedirectTo } from '@/lib/data/legacy-location-redirect';

/** Old /directory/county/CA/Alameda links → /bookshops/california/county/alameda. */
export async function GET(request: Request, { params }: { params: Promise<{ state: string; county: string }> }) {
  const { state, county } = await params;
  return permanentRedirectTo(request, await legacyCountyPath(state, county));
}
