'use client';

import React, { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Phone, Globe, Star, Navigation } from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Bookstore, Feature, Event } from '@/shared/schema';
import { LocalBusinessSchema, BreadcrumbSchema } from '@/components/StructuredData';
import SingleLocationMap from '@/components/SingleLocationMap';
import { Button } from '@/components/ui/button';

type BookshopDetailClientProps = {
  bookstore: Bookstore;
  canonicalSlug: string;
};

export default function BookshopDetailClient({ bookstore, canonicalSlug }: BookshopDetailClientProps) {
  const router = useRouter();

  // Fetch features
  const { data: features } = useQuery<Feature[]>({
    queryKey: ['/api/features'],
  });

  // Fetch events for this bookshop
  const { data: events } = useQuery<Event[]>({
    queryKey: [`/api/bookstores/${bookstore.id}/events`],
    enabled: !!bookstore.id,
  });

  // Get feature names for the bookshop
  const bookshopFeatures = useMemo(() => {
    if (!features || !bookstore.featureIds) return [];
    return features.filter(feature => 
      bookstore.featureIds?.includes(feature.id) || false
    );
  }, [features, bookstore.featureIds]);

  // Redirect to canonical URL if needed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      const canonicalPath = `/bookshop/${canonicalSlug}`;

      if (currentPath !== canonicalPath && canonicalSlug) {
        router.replace(canonicalPath);
      }
    }
  }, [canonicalSlug, router]);

  // Priority-based description for UI display
  const displayDescription =
    (bookstore.googleDescription && bookstore.googleDescription.length >= 100 && bookstore.googleDescription) ||
    (bookstore.aiGeneratedDescription && bookstore.descriptionValidated && bookstore.aiGeneratedDescription) ||
    bookstore.description ||
    undefined;

  // Breadcrumb schema items
  const breadcrumbItems = [
    { name: 'Home', url: 'https://www.indiebookshop.com' },
    { name: 'Directory', url: 'https://www.indiebookshop.com/directory' },
  ];

  if (bookstore.state) {
    breadcrumbItems.push({
      name: bookstore.state,
      url: `https://www.indiebookshop.com/directory?state=${bookstore.state}`,
    });
  }

  breadcrumbItems.push({
    name: bookstore.name,
    url: `https://www.indiebookshop.com/bookshop/${canonicalSlug}`,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Structured Data */}
      <LocalBusinessSchema bookstore={bookstore} />
      <BreadcrumbSchema items={breadcrumbItems} />

      {/* Breadcrumbs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <nav className="flex items-center space-x-2 text-sm">
            <Link href="/" className="text-[#2A6B7C] hover:underline">
              Home
            </Link>
            <span className="text-gray-400">/</span>
            <Link href="/directory" className="text-[#2A6B7C] hover:underline">
              Directory
            </Link>
            <span className="text-gray-400">/</span>
            {bookstore.state && (
              <>
                <Link href={`/directory?state=${bookstore.state}`} className="text-[#2A6B7C] hover:underline">
                  {bookstore.state}
                </Link>
                <span className="text-gray-400">/</span>
              </>
            )}
            <span className="text-gray-700">{bookstore.name}</span>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h1 className="font-serif text-3xl md:text-4xl font-bold text-[#5F4B32] mb-4">{bookstore.name}</h1>

              {/* Location */}
              <div className="flex items-start text-gray-700 mb-4">
                <MapPin className="w-5 h-5 mr-2 mt-1 flex-shrink-0 text-[#2A6B7C]" />
                <div>
                  {bookstore.street && <div>{bookstore.street}</div>}
                  <div>
                    {bookstore.city}, {bookstore.state} {bookstore.zip}
                  </div>
                </div>
              </div>

              {/* Rating */}
              {bookstore.googleRating && (
                <div className="flex items-center mb-4">
                  <Star className="w-5 h-5 text-yellow-600 fill-current mr-1" />
                  <span className="font-semibold text-gray-900">{bookstore.googleRating}</span>
                  {bookstore.googleReviewCount && <span className="text-gray-600 ml-1">({bookstore.googleReviewCount.toLocaleString()} reviews)</span>}
                </div>
              )}

              {/* Description */}
              {displayDescription && (
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 leading-relaxed">{displayDescription}</p>
                </div>
              )}

              {/* Features & Specialties */}
              {bookshopFeatures.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-serif text-xl font-bold text-[#5F4B32] mb-4">Features & Specialties</h3>
                  <div className="flex flex-wrap gap-2">
                    {bookshopFeatures.map(feature => (
                      <span 
                        key={feature.id} 
                        className="bg-[rgba(42,107,124,0.1)] text-[#2A6B7C] rounded-full px-3 py-1 text-xs font-semibold"
                      >
                        {feature.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Photo Gallery */}
            {bookstore.imageUrl && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="font-serif text-2xl font-bold text-[#5F4B32] mb-4">Photo Gallery</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <div className="rounded-md h-28 w-full overflow-hidden bg-gray-100">
                    <img 
                      src={bookstore.imageUrl} 
                      alt={`${bookstore.name} bookstore`}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  {/* Additional placeholder images could be added here if we have more photos */}
                </div>
              </div>
            )}

            {/* Events */}
            {events && events.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="font-serif text-2xl font-bold text-[#5F4B32] mb-4">Upcoming Events</h2>
                <div className="space-y-4">
                  {events.map(event => (
                    <div key={event.id} className="border-l-4 border-[#E16D3D] pl-4 py-2">
                      <p className="font-bold text-[#5F4B32]">{event.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{event.date} • {event.time}</p>
                      <p className="text-sm mt-2 text-gray-700">{event.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contact Info */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="font-serif text-2xl font-bold text-[#5F4B32] mb-4">Contact Information</h2>

              <div className="space-y-3">
                {/* Phone */}
                {bookstore.phone && (
                  <div className="flex items-center">
                    <Phone className="w-5 h-5 mr-3 text-[#2A6B7C]" />
                    <a href={`tel:${bookstore.phone}`} className="text-[#2A6B7C] hover:underline">
                      {bookstore.formattedPhone || bookstore.phone}
                    </a>
                  </div>
                )}

                {/* Website */}
                {bookstore.website && (
                  <div className="flex items-center">
                    <Globe className="w-5 h-5 mr-3 text-[#2A6B7C]" />
                    <a href={bookstore.website} target="_blank" rel="noopener noreferrer" className="text-[#2A6B7C] hover:underline flex items-center">
                      Visit Website
                      <span className="ml-1 text-xs">↗</span>
                    </a>
                  </div>
                )}

                {/* Google Maps */}
                {bookstore.googleMapsUrl && (
                  <div className="flex items-center">
                    <MapPin className="w-5 h-5 mr-3 text-[#2A6B7C]" />
                    <a href={bookstore.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-[#2A6B7C] hover:underline flex items-center">
                      View on Google Maps
                      <span className="ml-1 text-xs">↗</span>
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Hours */}
            {(bookstore.openingHoursJson?.weekday_text || bookstore.hours) && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="font-serif text-2xl font-bold text-[#5F4B32] mb-4">Hours</h2>
                {bookstore.openingHoursJson?.weekday_text ? (
                  <>
                    <div className="space-y-2">
                      {bookstore.openingHoursJson.weekday_text.map((hours, index) => (
                        <div key={index} className="text-gray-700">
                          {hours}
                        </div>
                      ))}
                    </div>
                    {bookstore.openingHoursJson.open_now !== undefined && (
                      <div className="mt-4 inline-block">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${bookstore.openingHoursJson.open_now ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {bookstore.openingHoursJson.open_now ? 'Open Now' : 'Closed'}
                        </span>
                      </div>
                    )}
                  </>
                ) : bookstore.hours ? (
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    {Object.entries(bookstore.hours).map(([day, hours]) => (
                      <React.Fragment key={day}>
                        <p className="font-medium">{day}:</p>
                        <p>{hours}</p>
                      </React.Fragment>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Right Column - Map & CTA */}
          <div className="lg:col-span-1 space-y-6">
            {/* Map */}
            {bookstore.latitude && bookstore.longitude && (
              <div className="bg-white rounded-lg shadow-md p-4">
                <h3 className="font-serif text-xl font-bold text-[#5F4B32] mb-4">Location</h3>
                <div className="bg-gray-200 rounded-lg overflow-hidden" style={{ height: '300px' }}>
                  <SingleLocationMap 
                    latitude={bookstore.latitude} 
                    longitude={bookstore.longitude} 
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2 mb-3">
                  {bookstore.city}, {bookstore.state}
                </p>
                <a 
                  href={`https://www.google.com/maps/dir/?api=1&destination=${bookstore.latitude},${bookstore.longitude}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block w-full"
                >
                  <Button className="w-full bg-[#2A6B7C] hover:bg-[#2A6B7C]/90 text-white">
                    <Navigation className="h-4 w-4 mr-2" /> Get Directions
                  </Button>
                </a>
              </div>
            )}

            {/* CTA */}
            <div className="bg-[#2A6B7C] text-white rounded-lg shadow-md p-6">
              <h3 className="font-serif text-xl font-bold mb-3">Support This Bookshop</h3>
              <p className="text-sm mb-4 opacity-90">Independent bookshops are the heart of local communities. Visit, shop, and help keep them thriving!</p>
              {bookstore.website && (
                <a href={bookstore.website} target="_blank" rel="noopener noreferrer" className="block w-full bg-white text-[#2A6B7C] text-center py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                  Visit Their Website
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Related Bookshops */}
        {bookstore.state && (
          <div className="mt-12">
            <h2 className="font-serif text-2xl font-bold text-[#5F4B32] mb-6">More Bookshops in {bookstore.state}</h2>
            <div className="bg-white rounded-lg shadow-md p-6">
              <Link href={`/directory?state=${bookstore.state}`} className="text-[#2A6B7C] hover:underline font-semibold">
                Browse all bookshops in {bookstore.state} →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
