'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Phone, Globe, Star } from 'lucide-react';
import Link from 'next/link';
import { Bookstore } from '@/shared/schema';
import { LocalBusinessSchema, BreadcrumbSchema } from '@/components/StructuredData';

type BookshopDetailClientProps = {
  bookstore: Bookstore;
  canonicalSlug: string;
};

export default function BookshopDetailClient({ bookstore, canonicalSlug }: BookshopDetailClientProps) {
  const router = useRouter();

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
            </div>

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
            {bookstore.openingHoursJson?.weekday_text && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="font-serif text-2xl font-bold text-[#5F4B32] mb-4">Hours</h2>
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
              </div>
            )}
          </div>

          {/* Right Column - Map & CTA */}
          <div className="lg:col-span-1 space-y-6">
            {/* Map Placeholder */}
            {bookstore.latitude && bookstore.longitude && (
              <div className="bg-white rounded-lg shadow-md p-4">
                <h3 className="font-serif text-xl font-bold text-[#5F4B32] mb-4">Location</h3>
                <div className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
                  <MapPin className="w-12 h-12 text-gray-400" />
                  <span className="ml-2 text-gray-500">[Map placeholder]</span>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {bookstore.city}, {bookstore.state}
                </p>
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
