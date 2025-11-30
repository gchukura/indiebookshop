import React from 'react';

import { MapPin, Phone, Globe, Clock, ExternalLink } from 'lucide-react';

import SingleLocationMap from '@/components/SingleLocationMap';

import OptimizedImage from '@/components/OptimizedImage';



interface Feature {

  id: number;

  name: string;

}



interface BookshopDetails {

  id: number;

  name: string;

  city: string;

  state: string;

  street?: string;

  zip?: string;

  description?: string;

  phone?: string;

  website?: string;

  hours?: Record<string, string>;

  imageUrl?: string;

  latitude?: number;

  longitude?: number;

}



interface BookshopDetailContentProps {

  bookshop: BookshopDetails;

  features?: Feature[];

}



export const BookshopDetailContent: React.FC<BookshopDetailContentProps> = ({ bookshop, features = [] }) => {

  const {

    name,

    city,

    state,

    street,

    zip,

    description,

    phone,

    website,

    hours,

    imageUrl,

    latitude,

    longitude,

  } = bookshop;



  // Helper to format phone numbers

  const formatPhone = (phoneNum: string) => {

    const cleaned = phoneNum.replace(/\D/g, '');

    if (cleaned.length === 10) {

      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;

    }

    return phoneNum;

  };



  // Helper to clean up URLs

  const formatWebsite = (url: string) => {

    try {

      return new URL(url.startsWith('http') ? url : `https://${url}`).hostname;

    } catch {

      return url.replace(/^https?:\/\//, '').replace(/\/$/, '');

    }

  };



  // Get full address

  const fullAddress = [street, `${city}, ${state} ${zip}`].filter(Boolean).join('\n');



  return (

    <div className="bg-[#F7F3E8] min-h-screen">

      {/* Hero Section - Fixed height to prevent layout shift */}

      <div 

        className="relative w-full h-64 md:h-96 overflow-hidden"

        style={{ 

          minHeight: '256px',

          containIntrinsicSize: 'auto 256px'

        }}

      >

        <div className="absolute inset-0 w-full h-full">

          <OptimizedImage 

            src={imageUrl || "https://images.unsplash.com/photo-1507842217343-583bb7270b66?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=400"}

            alt={`${name} - independent bookshop in ${city}, ${state}`} 

            className="w-full h-full" 

            objectFit="cover"

            loading="eager"

            sizes="100vw"

            placeholderColor="#f7f3e8"

          />

        </div>

        

        {/* Gradient overlay for text readability */}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        

        {/* Title positioned at bottom of hero */}

        <div 

          className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 lg:px-8 pb-6 md:pb-8"

          style={{ minHeight: '120px' }}

        >

          <div className="container mx-auto">

            <h1 

              className="font-serif text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-2"

              style={{ 

                textShadow: '0 2px 4px rgba(0,0,0,0.3), 0 4px 8px rgba(0,0,0,0.2)',

                minHeight: '48px',

                lineHeight: '1.2'

              }}

            >

              {name}

            </h1>

            <div className="flex items-center gap-2 text-white/95 text-base md:text-lg">

              <MapPin className="w-5 h-5 flex-shrink-0" />

              <span className="font-sans" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>

                {city}, {state} • Indie Bookshop

              </span>

            </div>

          </div>

        </div>

      </div>



      {/* Main Content */}

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">

          

          {/* Left Column - Main Content */}

          <div className="lg:col-span-2 space-y-6">

            

            {/* About Section */}

            {description && (

              <section 

                className="bg-white rounded-lg shadow-sm border border-stone-200 p-6 md:p-8"

                style={{ minHeight: '300px' }}

              >

                <h2 className="font-serif text-2xl md:text-3xl text-[#5F4B32] font-bold mb-4">

                  About {name}

                </h2>

                <p className="text-base md:text-lg text-stone-700 mb-4 font-sans leading-relaxed">

                  {description}

                </p>

                <p className="text-base text-stone-600 font-sans leading-relaxed">

                  {name} is a cherished independent bookshop located in {city}, {state}. 

                  As a local indie bookshop, we provide a curated selection of books and a unique shopping 

                  experience that online retailers simply can't match.

                </p>

              </section>

            )}



            {/* Features Section */}

            <section 

              className="bg-white rounded-lg shadow-sm border border-stone-200 p-6 md:p-8"

              style={{ minHeight: features.length > 0 ? 'auto' : '180px' }}

            >

              <h2 className="font-serif text-2xl md:text-3xl text-[#5F4B32] font-bold mb-4">

                Specialty Areas & Features

              </h2>

              

              <p className="mb-4 text-stone-700">

                {name} specializes in the following areas and offers these features to our community:

              </p>



              {features.length > 0 ? (

                <div className="flex flex-wrap gap-2">

                  {features.map((feature) => (

                    <span

                      key={feature.id}

                      className="inline-flex items-center px-3 py-1.5 rounded-full bg-[rgba(42,107,124,0.1)] text-[#2A6B7C] text-sm font-semibold transition-all hover:bg-[rgba(42,107,124,0.15)]"

                    >

                      {feature.name}

                    </span>

                  ))}

                </div>

              ) : (

                <div className="bg-amber-50 rounded-lg border border-amber-200 p-6 text-center">

                  <p className="text-amber-900 font-medium mb-2">

                    Help us complete this listing!

                  </p>

                  <p className="text-sm text-amber-800">

                    We're still gathering information about {name}'s specialty areas and features.

                  </p>

                </div>

              )}

            </section>

          </div>



          {/* Right Column - Store Information Sidebar */}

          <div className="lg:col-span-1">

            <div 

              className="bg-white rounded-lg shadow-sm border border-stone-200 p-6 lg:sticky lg:top-6"

              style={{ minHeight: '400px' }}

            >

              <h2 className="font-serif text-xl md:text-2xl text-[#5F4B32] font-bold mb-6">

                Store Information

              </h2>

              

              <div className="space-y-6">

                {/* Address */}

                {(street || city) && (

                  <div className="flex gap-3">

                    <MapPin className="w-5 h-5 text-[#2A6B7C] flex-shrink-0 mt-0.5" />

                    <div className="text-sm">

                      <p className="font-bold text-stone-900 mb-1.5">Address</p>

                      <p className="text-stone-700 leading-relaxed whitespace-pre-line">

                        {fullAddress}

                      </p>

                    </div>

                  </div>

                )}



                {/* Phone */}

                {phone && (

                  <div className="flex gap-3">

                    <Phone className="w-5 h-5 text-[#2A6B7C] flex-shrink-0 mt-0.5" />

                    <div className="text-sm">

                      <p className="font-bold text-stone-900 mb-1.5">Phone</p>

                      <a

                        href={`tel:${phone}`}

                        className="text-[#E16D3D] hover:text-[#C55A2F] hover:underline transition-colors"

                      >

                        {formatPhone(phone)}

                      </a>

                    </div>

                  </div>

                )}



                {/* Website */}

                {website && (

                  <div className="flex gap-3">

                    <Globe className="w-5 h-5 text-[#2A6B7C] flex-shrink-0 mt-0.5" />

                    <div className="text-sm min-w-0">

                      <p className="font-bold text-stone-900 mb-1.5">Website</p>

                      <a

                        href={website.startsWith('http') ? website : `https://${website}`}

                        target="_blank"

                        rel="noopener noreferrer"

                        className="text-[#E16D3D] hover:text-[#C55A2F] hover:underline inline-flex items-center gap-1 break-all transition-colors"

                      >

                        {formatWebsite(website)}

                        <ExternalLink className="w-3 h-3 flex-shrink-0" />

                      </a>

                    </div>

                  </div>

                )}



                {/* Hours */}

                <div className="flex gap-3">

                  <Clock className="w-5 h-5 text-[#2A6B7C] flex-shrink-0 mt-0.5" />

                  <div className="text-sm flex-1">

                    <p className="font-bold text-stone-900 mb-1.5">Hours</p>

                    {hours && Object.keys(hours).length > 0 ? (

                      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-stone-700">

                        {Object.entries(hours).map(([day, time]) => (

                          <React.Fragment key={day}>

                            <p className="font-medium">{day}:</p>

                            <p>{time}</p>

                          </React.Fragment>

                        ))}

                      </div>

                    ) : phone ? (

                      <p className="text-stone-500 italic">Call for hours</p>

                    ) : (

                      <p className="text-stone-500 italic">Hours not available</p>

                    )}

                  </div>

                </div>

              </div>



              {/* CTA Buttons */}

              <div className="mt-8 pt-6 border-t border-stone-200 space-y-3">

                {website && (

                  <a

                    href={website.startsWith('http') ? website : `https://${website}`}

                    target="_blank"

                    rel="noopener noreferrer"

                    className="block w-full bg-[#E16D3D] hover:bg-[#C55A2F] text-white text-center py-3 px-4 rounded-lg font-medium transition-colors"

                  >

                    Visit Website

                  </a>

                )}

                

                {(latitude && longitude) && (

                  <a

                    href={`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`}

                    target="_blank"

                    rel="noopener noreferrer"

                    className="block w-full bg-white hover:bg-stone-50 text-[#2A6B7C] text-center py-3 px-4 rounded-lg font-medium border-2 border-[#2A6B7C] transition-colors"

                  >

                    Get Directions

                  </a>

                )}

              </div>

            </div>



            {/* Map Section */}

            {(latitude && longitude) && (

              <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6 mt-6">

                <h3 className="font-serif text-xl text-[#5F4B32] font-bold mb-4">Store Location</h3>

                <div 

                  className="bg-stone-200 rounded-md overflow-hidden"

                  style={{ height: '256px', minHeight: '256px' }}

                >

                  <SingleLocationMap 

                    latitude={latitude !== undefined ? String(latitude) : undefined} 

                    longitude={longitude !== undefined ? String(longitude) : undefined} 

                  />

                </div>

              </div>

            )}

          </div>

        </div>

      </div>

    </div>

  );

};



export default BookshopDetailContent;

