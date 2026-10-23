import Link from 'next/link';
import type { FeatureLink } from '@/lib/data/feature-index';

type FeatureChipsProps = {
  featureIds: number[] | null | undefined;
  /** Feature id → name and page link; ids missing here are skipped. */
  links: Record<number, FeatureLink>;
  limit?: number;
  className?: string;
};

/** Feature tags, each linking to its /bookshops/features page when one exists. */
export default function FeatureChips({ featureIds, links, limit, className = '' }: FeatureChipsProps) {
  const chips = (featureIds ?? []).map(id => links[id]).filter(Boolean).slice(0, limit);
  if (!chips.length) return null;
  const chipClass = 'text-xs px-2 py-0.5 rounded-full bg-brand-cream text-brand-brown';
  return (
    <ul className={`flex flex-wrap gap-1.5 ${className}`} aria-label="Features">
      {chips.map(chip => (
        <li key={chip.name}>
          {chip.href ? (
            <Link href={chip.href} className={`${chipClass} inline-block hover:bg-brand-teal hover:text-white transition-colors`}>
              {chip.name}
            </Link>
          ) : (
            <span className={`${chipClass} inline-block`}>{chip.name}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
