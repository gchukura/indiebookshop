import { ogCard, OG_CONTENT_TYPE, OG_SIZE } from '@/lib/og';
import { getLocationIndex } from '@/lib/data/locations';

export const alt = 'Independent bookshops in this county';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export const revalidate = 3600;
export async function generateStaticParams() {
  return [];
}

export default async function Image({ params }: { params: Promise<{ state: string; county: string }> }) {
  const { state: stateSlug, county: countySlug } = await params;
  const state = (await getLocationIndex()).statesBySlug[stateSlug];
  const county = state?.countiesBySlug[countySlug];
  if (!state || !county) return ogCard({ title: 'Independent bookshops across the United States', footer: 'indiebookshop.com' });
  const n = county.shops.length;
  return ogCard({
    title: `Independent Bookshops in ${county.displayName}, ${state.abbrev}`,
    subtitle: `${n.toLocaleString('en-US')} shop${n === 1 ? '' : 's'}`,
    footer: 'indiebookshop.com',
  });
}
