import { ogCard, OG_CONTENT_TYPE, OG_SIZE } from '@/lib/og';
import { getLocationIndex } from '@/lib/data/locations';

export const alt = 'Independent bookshops in this city';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export const revalidate = 3600;
export async function generateStaticParams() {
  return [];
}

export default async function Image({ params }: { params: Promise<{ state: string; city: string }> }) {
  const { state: stateSlug, city: citySlug } = await params;
  const state = (await getLocationIndex()).statesBySlug[stateSlug];
  const city = state?.citiesBySlug[citySlug];
  if (!state || !city) return ogCard({ title: 'Independent bookshops across the United States', footer: 'indiebookshop.com' });
  const n = city.shops.length;
  return ogCard({
    title: `Independent Bookshops in ${city.name}, ${state.abbrev}`,
    subtitle: `${n.toLocaleString('en-US')} shop${n === 1 ? '' : 's'}`,
    footer: 'indiebookshop.com',
  });
}
