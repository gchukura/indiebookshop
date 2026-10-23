import Link from 'next/link';
import type { FeatureLink } from '@/lib/data/feature-index';

type FeatureChipsProps = {
  featureIds: number[] | null | undefined;
  /** Feature id → name and page link; ids missing here are skipped. */
  links: Record<number, FeatureLink>;
  limit?: number;
  className?: string;
  /** Plain labels instead of links (e.g. inside a card that is itself a link). */
  asLabels?: boolean;
};

/** Feature tags, each linking to its /bookshops/features page when one exists. */
export default function FeatureChips({ featureIds, links, limit, className = '', asLabels = false }: FeatureChipsProps) {
  const chips = (featureIds ?? []).map(id => links[id]).filter(Boolean).slice(0, limit);
  if (!chips.length) return null;
  const chipClass = 'text-sm px-3 rounded-full bg-brand-cream text-brand-brown';
  return (
    <ul className={`flex flex-wrap gap-1.5 ${className}`} aria-label="Features">
      {chips.map(chip => (
        <li key={chip.name}>
          {chip.href && !asLabels ? (
            <Link href={chip.href} className={`${chipClass} inline-flex items-center min-h-[44px] hover:bg-brand-teal hover:text-white transition-colors`}>
              {chip.name}
            </Link>
          ) : (
            <span className={`${chipClass} inline-block py-0.5`}>{chip.name}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
