import React, { useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Bookstore as Bookshop, Feature, Event } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { X, Navigation } from "lucide-react";
import SingleLocationMap from "./SingleLocationMap";
import SchemaOrg from "./SchemaOrg";
import RelatedBookshops from "./RelatedBookshops";
import OptimizedImage from "./OptimizedImage";
import Breadcrumbs, { BreadcrumbItem } from "./Breadcrumbs";
import { BASE_URL } from "../lib/seo";
import { generateBookshopImageAlt, optimizeImageUrl } from "../lib/imageUtils";
import { generateRelatedLinks, generateEventLinks } from "../lib/linkUtils";

interface BookshopDetailProps {
  bookshopId: number;
  isOpen: boolean;
  onClose: () => void;
}

const BookshopDetail = ({ bookshopId, isOpen, onClose }: BookshopDetailProps) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Fetch bookshop details
  const { data: bookshop, isLoading: isLoadingBookshop } = useQuery<Bookshop>({
    queryKey: [`/api/bookstores/${bookshopId}`],
    enabled: isOpen && bookshopId > 0,
  });

  // Fetch all features to match with bookshop.featureIds
  const { data: features } = useQuery<Feature[]>({
    queryKey: ["/api/features"],
    enabled: isOpen,
  });

  // Fetch events for this bookshop
  const { data: events } = useQuery<Event[]>({
    queryKey: [`/api/bookstores/${bookshopId}/events`],
    enabled: isOpen && bookshopId > 0,
  });

  // Handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Get feature names for the bookshop
  const bookshopFeatures = features?.filter(feature => {
    // Handle both array and single value featureIds formats
    if (!bookshop?.featureIds) return false;
    
    // Convert any format of featureIds to array for processing
    let featureIdArray: number[] = [];
    
    if (Array.isArray(bookshop.featureIds)) {
      featureIdArray = bookshop.featureIds;
    } else if (typeof bookshop.featureIds === 'string') {
      // Parse comma-separated string of featureIds
      featureIdArray = bookshop.featureIds.split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id));
    } else if (typeof bookshop.featureIds === 'number') {
      featureIdArray = [bookshop.featureIds];
    }
    
    return featureIdArray.includes(feature.id);
  }) || [];

  // Create breadcrumb items
  const breadcrumbItems: BreadcrumbItem[] = bookshop ? [
    { label: 'Home', href: '/' },
    { label: 'Directory', href: '/directory' },
    { label: bookshop.state, href: `/directory/state/${bookshop.state}` },
    { label: bookshop.city, href: `/directory/city/${encodeURIComponent(bookshop.city)}` },
    { label: bookshop.name, href: `/bookshop/${bookshop.id}`, isCurrent: true }
  ] : [];

  // Prepare schema.org data when bookshop is available
  // Bookshop schema
  const bookshopSchema = bookshop ? {
    type: 'bookshop' as const,
    name: bookshop.name,
    description: bookshop.description || `Independent bookshop in ${bookshop.city}, ${bookshop.state}`,
    url: `${BASE_URL}/bookshop/${bookshop.id}`,
    image: bookshop.imageUrl || undefined,
    address: {
      streetAddress: bookshop.street || '',
      addressLocality: bookshop.city,
      addressRegion: bookshop.state,
      postalCode: bookshop.zip || '',
      addressCountry: 'US'
    },
    telephone: bookshop.phone || undefined,
    geo: bookshop.latitude && bookshop.longitude ? {
      latitude: String(bookshop.latitude),
      longitude: String(bookshop.longitude)
    } : undefined,
    openingHours: bookshop.hours ? JSON.stringify(bookshop.hours) : undefined,
    features: bookshopFeatures.map(f => f.name)
  } : null;

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 z-50 overflow-y-auto">
      {/* Schema.org structured data */}
      {bookshopSchema && <SchemaOrg schema={bookshopSchema} />}
      
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div 
          ref={modalRef}
          className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl w-full"
        >
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button 
              type="button" 
              className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <X className="h-6 w-6" />
            </button>
          </div>
          
          {isLoadingBookshop ? (
            <div className="p-8 text-center">
              <p>Loading bookshop details...</p>
            </div>
          ) : !bookshop ? (
            <div className="p-8 text-center">
              <p>Could not load bookshop details. Please try again.</p>
            </div>
          ) : (
            <div className="bg-[#F7F3E8]">
              <div className="relative h-64 md:h-96">
                <OptimizedImage
                  src={optimizeImageUrl(
                    bookshop.imageUrl || "https://images.unsplash.com/photo-1507842217343-583bb7270b66?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=400",
                    'detail'
                  )}
                  alt={generateBookshopImageAlt(
                    bookshop.name, 
                    bookshop.city, 
                    bookshop.state, 
                    bookshopFeatures.map(f => f.name)
                  )} 
                  className="w-full h-full"
                  objectFit="cover"
                  loading="eager"
                  sizes="100vw"
                  placeholderColor="#f7f3e8"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                  <h2 className="text-white text-2xl md:text-3xl font-serif font-bold">{bookshop.name}</h2>
                  <p className="text-white/90 text-sm md:text-base">{bookshop.city}, {bookshop.state}</p>
                </div>
              </div>
              
              {/* Breadcrumb Navigation */}
              <div className="p-4 bg-gray-50">
                <Breadcrumbs items={breadcrumbItems} className="text-sm" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
                <div className="md:col-span-2">
                  <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h3 className="font-serif font-bold text-xl mb-4">About</h3>
                    <p className="mb-4">{bookshop.description}</p>
                    
                    <div className="mt-6">
                      <h3 className="font-serif font-bold text-xl mb-4">Features & Specialties</h3>
                      <div className="flex flex-wrap gap-2">
                        {bookshopFeatures && bookshopFeatures.length > 0 ? (
                          bookshopFeatures.map(feature => (
                            <span key={feature.id} className="store-feature-tag bg-[rgba(42,107,124,0.1)] text-[#2A6B7C] rounded-full px-3 py-1 text-xs font-semibold">
                              {feature.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-500 text-sm">No special features listed</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <h3 className="font-serif font-bold text-xl mb-4">Photo Gallery</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {/* Use locally hosted SVG images that we created */}
                        <div className="rounded-md h-28 w-full overflow-hidden bg-gray-100">
                          <img 
                            src={bookshop.imageUrl || "/images/bookshop-interior.svg"} 
                            alt={`${bookshop.name} bookstore interior`}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = "/images/bookshop-interior.svg";
                            }}
                          />
                        </div>
                        <div className="rounded-md h-28 w-full overflow-hidden bg-gray-100">
                          <img 
                            src="/images/bookshop-display.svg" 
                            alt={`Book display at ${bookshop.name}`}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="rounded-md h-28 w-full overflow-hidden bg-gray-100">
                          <img 
                            src="/images/bookshop-reading.svg" 
                            alt={`Reading area at ${bookshop.name}`}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="rounded-md h-28 w-full overflow-hidden bg-gray-100">
                          <img 
                            src="/images/bookshop-storefront.svg" 
                            alt={`${bookshop.name} storefront`}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="rounded-md h-28 w-full overflow-hidden bg-gray-100">
                          <img 
                            src="/images/bookshop-cafe.svg" 
                            alt={`Café area at ${bookshop.name}`}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="rounded-md h-28 w-full overflow-hidden bg-gray-100">
                          <img 
                            src="/images/bookshop-event.svg" 
                            alt={`Author event at ${bookshop.name}`}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {events && events.length > 0 && (
                      <div className="mt-6">
                        <h3 className="font-serif font-bold text-xl mb-4">Upcoming Events</h3>
                        <div className="space-y-4">
                          {events.map(event => (
                            <div key={event.id} className="border-l-4 border-[#E16D3D] pl-4">
                              <p className="font-bold">{event.title}</p>
                              <p className="text-sm text-gray-600">{event.date} • {event.time}</p>
                              <p className="text-sm mt-1">{event.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="md:col-span-1">
                  <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h3 className="font-serif font-bold text-xl mb-4">Store Information</h3>
                    <div className="space-y-4">
                      <div>
                        <p className="font-bold">Address</p>
                        <p>{bookshop.street}</p>
                        <p>{bookshop.city}, {bookshop.state} {bookshop.zip}</p>
                      </div>
                      
                      <div>
                        <p className="font-bold">Contact</p>
                        <p>Phone: {bookshop.phone || 'Not available'}</p>
                        <p>Website: {bookshop.website ? (
                          <a href={bookshop.website} target="_blank" rel="noopener noreferrer" className="text-[#2A6B7C] hover:text-[#E16D3D]">
                            {new URL(bookshop.website).hostname}
                          </a>
                        ) : 'Not available'}</p>
                      </div>
                      
                      <div>
                        <p className="font-bold">Hours</p>
                        {bookshop.hours ? (
                          <div className="grid grid-cols-2 gap-1 text-sm">
                            {Object.entries(bookshop.hours).map(([day, hours]) => (
                              <React.Fragment key={day}>
                                <p>{day}:</p>
                                <p>{hours}</p>
                              </React.Fragment>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm">Hours not available</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h3 className="font-serif font-bold text-xl mb-4">Store Location</h3>
                    <div className="bg-gray-200 h-52 rounded-md overflow-hidden">
                      <SingleLocationMap 
                        latitude={bookshop.latitude} 
                        longitude={bookshop.longitude} 
                      />
                    </div>
                    <div className="mt-4">
                      {bookshop.latitude && bookshop.longitude ? (
                        <a 
                          href={`https://www.google.com/maps/dir/?api=1&destination=${bookshop.latitude},${bookshop.longitude}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block w-full"
                        >
                          <Button className="w-full bg-[#2A6B7C] hover:bg-[#2A6B7C]/90 text-white py-2 rounded-md font-medium">
                            <Navigation className="h-4 w-4 mr-2" /> Get Directions
                          </Button>
                        </a>
                      ) : (
                        <Button disabled className="w-full bg-[#2A6B7C]/50 text-white py-2 rounded-md font-medium">
                          <Navigation className="h-4 w-4 mr-2" /> Get Directions
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Related Links Section */}
                  <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h3 className="font-serif font-bold text-xl mb-4">Explore More</h3>
                    <div className="space-y-4">
                      {features && features.length > 0 && (
                        <>
                          <h4 className="font-medium text-[#2A6B7C]">Related Directories</h4>
                          <div className="grid gap-2">
                            {generateRelatedLinks(bookshop, features).map((link, index) => (
                              <Link 
                                key={index} 
                                to={link.url}
                                className="text-blue-600 hover:underline hover:text-blue-800 block"
                                title={link.description}
                              >
                                {link.title}
                              </Link>
                            ))}
                          </div>
                        </>
                      )}
                      
                      <h4 className="font-medium text-[#2A6B7C] mt-4">Event Information</h4>
                      <div className="grid gap-2">
                        {generateEventLinks(bookshop.id, bookshop.name).map((link, index) => (
                          <Link 
                            key={index} 
                            to={link.url}
                            className="text-blue-600 hover:underline hover:text-blue-800 block"
                            title={link.description}
                          >
                            {link.title}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Related Bookshops Section */}
                  {bookshop && <RelatedBookshops currentBookshop={bookshop} />}

                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookshopDetail;
