// components/templates/BookstorePageTemplate.tsx
// Reusable template for bookstore detail pages

import { Bookstore } from '@/shared/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  MapPin,
  Phone,
  Globe,
  Clock,
  Star,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { generateAboutBookstoreContent } from '@/lib/bookstore-content-utils';

interface BookstorePageTemplateProps {
  bookstore: Bookstore;
  relatedBookstores?: Bookstore[];
  aboutContent?: string;
}

export function BookstorePageTemplate({
  bookstore,
  relatedBookstores = [],
  aboutContent,
}: BookstorePageTemplateProps) {
  // Generate about content if not provided
  const content = aboutContent || generateAboutBookstoreContent(bookstore);

  const rating = bookstore.googleRating ? parseFloat(bookstore.googleRating) : null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content */}
        <div className="flex-1">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-primary mb-2">
              {bookstore.name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {bookstore.city}, {bookstore.state}
              </span>
              {rating && (
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  {rating.toFixed(1)}
                  {bookstore.googleReviewCount && (
                    <span className="text-sm">
                      ({bookstore.googleReviewCount} reviews)
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Image */}
          {bookstore.imageUrl && (
            <div className="mb-6 rounded-lg overflow-hidden">
              <img
                src={bookstore.imageUrl}
                alt={bookstore.name}
                className="w-full h-64 object-cover"
              />
            </div>
          )}

          {/* About Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>About {bookstore.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-line">
                {content}
              </p>
            </CardContent>
          </Card>

          {/* Contact & Hours */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p>{bookstore.street}</p>
                    <p>
                      {bookstore.city}, {bookstore.state} {bookstore.zip}
                    </p>
                  </div>
                </div>

                {(bookstore.phone || bookstore.formattedPhone) && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`tel:${bookstore.formattedPhone || bookstore.phone}`}
                      className="hover:underline"
                    >
                      {bookstore.formattedPhone || bookstore.phone}
                    </a>
                  </div>
                )}

                {bookstore.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={bookstore.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline flex items-center gap-1"
                    >
                      Visit Website
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {bookstore.googleMapsUrl && (
                  <Button asChild variant="outline" className="mt-4">
                    <a
                      href={bookstore.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Get Directions
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Hours */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bookstore.openingHoursJson?.weekday_text ? (
                  <ul className="space-y-1 text-sm">
                    {bookstore.openingHoursJson.weekday_text.map((day, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{day.split(': ')[0]}</span>
                        <span className="text-muted-foreground">
                          {day.split(': ')[1]}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">
                    Hours not available. Please contact the bookshop directly.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Related Bookshops */}
          {relatedBookstores.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Nearby Bookshops</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-4">
                  {relatedBookstores.map((related) => (
                    <Link
                      key={related.id}
                      href={`/bookshop/${related.slug}`}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
                    >
                      {related.imageUrl && (
                        <img
                          src={related.imageUrl}
                          alt={related.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      <div>
                        <h3 className="font-medium">{related.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {related.city}, {related.state}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default BookstorePageTemplate;
