import { legacyStatePath, permanentRedirectTo } from '@/lib/data/legacy-location-redirect';

/** Old /directory/state/CA links → /bookshops/california. */
export async function GET(request: Request, { params }: { params: Promise<{ state: string }> }) {
  const { state } = await params;
  return permanentRedirectTo(request, await legacyStatePath(state));
}
