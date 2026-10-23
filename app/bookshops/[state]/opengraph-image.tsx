import { ogCard, OG_CONTENT_TYPE, OG_SIZE } from '@/lib/og';
import { getLocationIndex } from '@/lib/data/locations';

export const alt = 'Independent bookshops in this state';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export const revalidate = 3600;
export async function generateStaticParams() {
  return [];
}

const shopCount = (n: number) => `${n.toLocaleString('en-US')} shop${n === 1 ? '' : 's'}`;

export default async function Image({ params }: { params: Promise<{ state: string }> }) {
  const { state: slug } = await params;
  const state = (await getLocationIndex()).statesBySlug[slug];
  if (!state) return ogCard({ title: 'Independent bookshops across the United States', footer: 'indiebookshop.com' });
  return ogCard({
    title: `Independent Bookshops in ${state.name}`,
    subtitle: `${shopCount(state.shops.length)} in ${state.cities.length} cities and towns`,
    footer: 'indiebookshop.com',
  });
}
