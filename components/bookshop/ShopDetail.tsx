import { Globe, MapPin, Navigation, Pencil, Phone, Star } from 'lucide-react';
import Link from 'next/link';
import type { Bookstore, Event } from '@/shared/schema';
import LocationBreadcrumbs, { type Crumb } from '@/components/location/LocationBreadcrumbs';
import { LocalBusinessSchema } from '@/components/StructuredData';
import BookshopCard from '@/components/bookshop/BookshopCard';
import FeatureChips from '@/components/bookshop/FeatureChips';
import AdSlot from '@/components/ads/AdSlot';
import { ADS_ENABLED } from '@/lib/ads';
import LazyShopMap from '@/components/bookshop/LazyShopMap';
import PhotoGallery from '@/components/bookshop/PhotoGallery';
import { HoursTable, OpenStatusBadge } from '@/components/bookshop/ShopHours';
import { getBookshopPhotoUrl, getPlaceholderUrl } from '@/lib/bookshop-image';
import { getBookstoreDescription } from '@/lib/data/bookstore-content';
import type { FeatureLink } from '@/lib/data/feature-index';
import { cityPath, hasStatePage, statePath } from '@/lib/data/location-slugs';
import type { NearbyShop } from '@/lib/data/nearby';
import { shopTimeZone } from '@/lib/data/timezones';
import { weeklyHours } from '@/lib/data/shop-hours';
import { shopCoordinates } from '@/lib/data/geo';
import { getStateAbbrev, getStateDisplayName } from '@/lib/state-utils';

type ShopDetailProps = {
  bookstore: Bookstore;
  canonicalSlug: string;
  nearby: NearbyShop[];
  events: Event[];
  featureLinks: Record<number, FeatureLink>;
  mapboxToken: string;
};

const card = 'bg-white rounded-lg shadow-md p-6';
const sectionTitle = 'font-serif text-2xl font-bold text-brand-brown mb-4';

function breadcrumbs(b: Bookstore, slug: string): Crumb[] {
  const us = hasStatePage(b.state);
  const abbrev = getStateAbbrev(b.state);
  const crumbs: Crumb[] = [{ name: 'Home', href: '/' }];
  crumbs.push(us ? { name: 'Bookshops', href: '/bookshops' } : { name: 'Directory', href: '/directory' });
  if (b.state) {
    crumbs.push({
      name: getStateDisplayName(b.state) || b.state,
      href: us ? statePath(b.state) : `/directory?state=${encodeURIComponent(abbrev)}`,
    });
  }
  if (b.city && b.state) {
    crumbs.push({
      name: b.city,
      href: us ? cityPath(b.city, b.state) : `/directory?state=${encodeURIComponent(abbrev)}&city=${encodeURIComponent(b.city)}`,
    });
  }
  crumbs.push({ name: b.name, href: `/bookshop/${slug}` });
  return crumbs;
}

function directionsUrl(b: Bookstore, address: string): string {
  const params = new URLSearchParams({ api: '1', destination: `${b.name}, ${address}` });
  if (b.googlePlaceId) params.set('destination_place_id', b.googlePlaceId);
  return `https://www.google.com/maps/dir/?${params}`;
}

function websiteLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Website';
  }
}

/** "March 2026" — stable, unlike "3 weeks ago" baked into a static page. */
function reviewDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/** Server-rendered bookshop page. Client islands: PhotoGallery, LazyShopMap, and the hours (time-dependent). */
export default function ShopDetail({ bookstore: b, canonicalSlug, nearby, events, featureLinks, mapboxToken }: ShopDetailProps) {
  const address = [b.street, [b.city, [getStateAbbrev(b.state), b.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')]
    .filter(Boolean)
    .join(', ');
  const phone = b.formattedPhone || b.phone;
  const description = getBookstoreDescription(b);
  const about = description.source === 'template' ? null : description.text;
  const photoUrl = getBookshopPhotoUrl(b);
  const coords = shopCoordinates(b);
  const timeZone = shopTimeZone(b.state, b.county, b.longitude);
  const hasHours = weeklyHours(b.openingHoursJson).length > 0;
  const reviews = (b.googleReviews ?? []).filter(r => r.author_name && r.text).slice(0, 5);
  const hasFeatures = (b.featureIds ?? []).some(id => featureLinks[id]);
  const crumbs = breadcrumbs(b, canonicalSlug);
  const cityCrumb = b.city && hasStatePage(b.state) ? crumbs[3] : undefined;

  const map =
    coords && mapboxToken ? (
      <LazyShopMap latitude={b.latitude!} longitude={b.longitude!} mapboxToken={mapboxToken} />
    ) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <LocalBusinessSchema bookstore={b} />
      <LocationBreadcrumbs items={crumbs} />

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <header className={card}>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-brand-brown mb-4">{b.name}</h1>
          <ul className="space-y-2 text-gray-700">
            {address && (
              <li className="flex items-start gap-2">
                <MapPin className="w-5 h-5 mt-0.5 shrink-0 text-brand-teal" aria-hidden="true" />
                <span>
                  {address}{' '}
                  <a
                    href={directionsUrl(b, address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] items-center gap-1 text-brand-teal hover:underline whitespace-nowrap"
                  >
                    <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
                    Directions
                  </a>
                </span>
              </li>
            )}
            {phone && (
              <li className="flex items-center gap-2">
                <Phone className="w-5 h-5 shrink-0 text-brand-teal" aria-hidden="true" />
                <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="inline-flex min-h-[44px] items-center text-brand-teal hover:underline">
                  {phone}
                </a>
              </li>
            )}
            {b.website && (
              <li className="flex items-center gap-2">
                <Globe className="w-5 h-5 shrink-0 text-brand-teal" aria-hidden="true" />
                <a href={b.website} target="_blank" rel="noopener nofollow" className="inline-flex min-h-[44px] items-center text-brand-teal hover:underline">
                  {websiteLabel(b.website)}
                </a>
              </li>
            )}
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            {b.googleRating && (
              <a href={reviews.length ? '#reviews' : undefined} className="flex min-h-[44px] items-center gap-1 text-gray-900">
                <Star className="w-5 h-5 text-yellow-600 fill-current" aria-hidden="true" />
                <span className="font-semibold">{b.googleRating}</span>
                {b.googleReviewCount ? (
                  <span className="text-gray-600">({b.googleReviewCount.toLocaleString('en-US')} Google reviews)</span>
                ) : null}
              </a>
            )}
            {hasHours && <OpenStatusBadge opening={b.openingHoursJson} timeZone={timeZone} />}
          </div>
          <p className="mt-4 text-sm">
            <Link
              href={`/submit?edit=${encodeURIComponent(canonicalSlug)}`}
              className="inline-flex min-h-[44px] items-center gap-1.5 text-gray-600 hover:text-brand-teal hover:underline"
            >
              <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
              Suggest an edit
            </Link>
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Hero + About (left, top) */}
          <div className="lg:col-span-2 space-y-8">
            {photoUrl ? (
              <PhotoGallery
                photos={[
                  {
                    src: photoUrl,
                    thumbSrc: getBookshopPhotoUrl(b, 'thumb') ?? undefined,
                    alt: `${b.name} in ${b.city}, ${getStateAbbrev(b.state)}`,
                    credit: b.photoAttribution ? { name: b.photoAttribution, url: b.photoAttributionUrl } : null,
                  },
                ]}
                fallbackSrc={getPlaceholderUrl(b.id, 'large')}
              />
            ) : map ? (
              <div className="aspect-[16/9] rounded-lg overflow-hidden bg-brand-cream">{map}</div>
            ) : null}

            {(about || hasFeatures) && (
              <section className={card} aria-labelledby="about-heading">
                <h2 id="about-heading" className={sectionTitle}>
                  About
                </h2>
                {about && <p className="text-gray-700 leading-relaxed">{about}</p>}
                <FeatureChips featureIds={b.featureIds} links={featureLinks} className={about ? 'mt-4' : ''} />
              </section>
            )}
            {/* Between About and Hours on phones (the sidebar stacks below) */}
            {ADS_ENABLED && <AdSlot name="shop-inline" lazy={false} />}
          </div>

          {/* Sidebar: hours, map */}
          <aside className="space-y-8 lg:col-start-3 lg:row-start-1 lg:row-span-2">
            {hasHours && (
              <section className={card} aria-labelledby="hours-heading">
                <h2 id="hours-heading" className={sectionTitle}>
                  Hours
                </h2>
                <HoursTable opening={b.openingHoursJson} timeZone={timeZone} />
              </section>
            )}
            {photoUrl && map && (
              <section className="bg-white rounded-lg shadow-md p-4" aria-labelledby="location-heading">
                <h2 id="location-heading" className="font-serif text-xl font-bold text-brand-brown mb-4">
                  Location
                </h2>
                <div className="aspect-square rounded-lg overflow-hidden bg-brand-cream">{map}</div>
                {b.googleMapsUrl && (
                  <a
                    href={b.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex min-h-[44px] items-center text-sm text-brand-teal hover:underline"
                  >
                    View on Google Maps
                  </a>
                )}
              </section>
            )}
            {ADS_ENABLED && (
              <div className="hidden lg:block sticky top-28">
                <AdSlot name="shop-rail" variant="rail" />
              </div>
            )}
          </aside>

          {/* Reviews + events (left, below) */}
          <div className="lg:col-span-2 lg:row-start-2 space-y-8">
            {reviews.length > 0 && (
              <section id="reviews" className={card} aria-labelledby="reviews-heading">
                <h2 id="reviews-heading" className={sectionTitle}>
                  Reviews
                </h2>
                <p className="text-sm text-gray-500 -mt-2 mb-6">From Google. Shown as written by the reviewers.</p>
                <div className="space-y-6">
                  {reviews.map((review, i) => (
                    <article key={i} className={i < reviews.length - 1 ? 'border-b border-gray-200 pb-6' : ''}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-brand-brown">{review.author_name}</p>
                          <p className="text-sm text-gray-500">{reviewDate(review.time)}</p>
                        </div>
                        <div className="flex items-center gap-1" role="img" aria-label={`${review.rating} out of 5 stars`}>
                          {[...Array(5)].map((_, s) => (
                            <Star
                              key={s}
                              aria-hidden="true"
                              className={`w-4 h-4 ${s < review.rating ? 'text-yellow-600 fill-current' : 'text-gray-300'}`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-700 leading-relaxed">{review.text}</p>
                    </article>
                  ))}
                </div>
                {b.googlePlaceId && (
                  <a
                    href={`https://www.google.com/maps/place/?q=place_id:${b.googlePlaceId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex min-h-[44px] items-center text-sm font-medium text-brand-teal hover:text-brand-orange"
                  >
                    Read all reviews on Google
                  </a>
                )}
              </section>
            )}

            {events.length > 0 && (
              <section className={card} aria-labelledby="events-heading">
                <h2 id="events-heading" className={sectionTitle}>
                  Upcoming events
                </h2>
                <ul className="space-y-4">
                  {events.map(event => (
                    <li key={event.id} className="border-l-4 border-brand-orange pl-4">
                      <p className="font-semibold text-brand-brown">{event.title}</p>
                      <p className="text-sm text-gray-600">{[event.date, event.time].filter(Boolean).join(' · ')}</p>
                      {event.description && <p className="mt-1 text-gray-700">{event.description}</p>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>

        {/* Nearby */}
        {nearby.length > 0 && (
          <section aria-labelledby="nearby-heading">
            <h2 id="nearby-heading" className={sectionTitle}>
              Nearby bookshops
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {nearby.map(({ shop, miles }) => (
                <BookshopCard key={shop.id} bookshop={shop} featureLinks={featureLinks} distanceMiles={miles} />
              ))}
            </div>
            {cityCrumb && (
              <p className="mt-6 text-sm">
                <Link href={cityCrumb.href} className="inline-flex min-h-[44px] items-center text-brand-teal hover:underline">
                  All bookshops in {b.city} →
                </Link>
              </p>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
