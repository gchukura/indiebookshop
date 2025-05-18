import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useLocation } from 'wouter';
import { Bookstore as Bookshop } from '@shared/schema';
import { getStateNameFromAbbreviation, createCityDirectoryUrlWithCounty, createBookshopUrlWithCounty } from '@/lib/urlUtils';
import BookshopCard from '@/components/BookshopCard';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ChevronRight, MapPin } from 'lucide-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import { SEO } from '@/components/SEO';
import { SchemaOrg } from '@/components/SchemaOrg';

const CountyDirectory = () => {
  const params = useParams<{ state: string, county: string }>();
  const { state, county } = params;
  const [location, setLocation] = useLocation();
  
  // Decode URL parameters
  const decodedState = decodeURIComponent(state);
  const decodedCounty = decodeURIComponent(county);
  
  // Get all bookshops
  const { data: bookshops, isLoading, error } = useQuery<Bookshop[]>({
    queryKey: ["/api/bookstores"],
  });
  
  // Group cities by this county
  const [citiesInCounty, setCitiesInCounty] = useState<string[]>([]);
  const [bookshopsInCounty, setBookshopsInCounty] = useState<Bookshop[]>([]);
  
  useEffect(() => {
    if (bookshops) {
      console.log(`Searching for bookshops in ${decodedState}, county: ${decodedCounty}`);
      
      // Convert URL formatted county name to possible database formats
      const countyNameVariations = [
        decodedCounty.toLowerCase(),                      // sussex-county
        decodedCounty.replace(/-/g, ' ').toLowerCase(),   // sussex county
        decodedCounty.replace(/-county$/, '').toLowerCase() // sussex
      ];
      
      const formattedCountyName = decodedCounty
        .replace(/-/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      // Add capitalized versions
      countyNameVariations.push(formattedCountyName.toLowerCase()); // Sussex County
      
      console.log(`Trying county variations: ${countyNameVariations.join(', ')}`);
      
      // Filter bookshops in this county, trying different county name formats
      const filteredBookshops = bookshops.filter(bookshop => {
        const stateMatch = 
          bookshop.state.toLowerCase() === decodedState.toLowerCase() || 
          getStateNameFromAbbreviation(bookshop.state).toLowerCase() === decodedState.toLowerCase();
        
        // If county is missing, skip this bookshop
        if (!bookshop.county) return false;
        
        // Check if any of our county name variations match
        const countyMatch = countyNameVariations.some(variation => 
          bookshop.county?.toLowerCase().includes(variation)
        );
        
        return bookshop.live !== false && stateMatch && countyMatch;
      });
      
      console.log(`Found ${filteredBookshops.length} bookshops in ${formattedCountyName}`);
      
      if (filteredBookshops.length > 0) {
        // Log a few examples to help with debugging
        console.log(`Example matches: ${filteredBookshops.slice(0, 3).map(b => 
          `${b.name} (${b.county})`).join(', ')}`);
      }
      
      setBookshopsInCounty(filteredBookshops);
      
      // Get unique cities in this county
      const uniqueCities = Array.from(new Set(
        filteredBookshops.map(bookshop => bookshop.city)
      )).sort();
      
      setCitiesInCounty(uniqueCities);
    }
  }, [bookshops, decodedState, decodedCounty]);
  
  // Find state abbreviation for display
  const stateAbbreviation = bookshopsInCounty[0]?.state || '';
  const displayStateName = getStateNameFromAbbreviation(stateAbbreviation).replace(/-/g, ' ');
  
  // Properly capitalize the county name (first letter of each word)
  const displayCountyName = decodedCounty
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  // SEO metadata
  const title = `Bookshops in ${displayCountyName}, ${displayStateName} | IndiebookShop`;
  const description = `Discover independent bookshops in ${displayCountyName}, ${displayStateName}. Browse local bookstores by city and find your next reading destination.`;
  
  // Loading and error states
  if (isLoading) {
    return <div className="container mx-auto p-4">Loading county directory...</div>;
  }
  
  if (error) {
    return <div className="container mx-auto p-4">Error loading county directory: {String(error)}</div>;
  }

  // No bookshops found
  if (bookshopsInCounty.length === 0) {
    return (
      <div className="container mx-auto p-4">
        <SEO title={title} description={description} />
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Bookshops', href: '/bookshops' },
            { label: displayStateName, href: `/bookshops/${decodedState}` },
            { label: displayCountyName, href: `/bookshops/${decodedState}/${decodedCounty}` },
          ]}
        />
        <h1 className="text-3xl font-bold mt-6 mb-4">Bookshops in {displayCountyName}, {displayStateName}</h1>
        <p>No bookshops found in this county. Try searching for bookshops in a different location.</p>
        <Button onClick={() => setLocation('/bookshops')} className="mt-4">
          Browse All Bookshops
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <SEO title={title} description={description} />
      
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Bookshops', href: '/bookshops' },
          { label: displayStateName, href: `/bookshops/${decodedState}` },
          { label: displayCountyName, href: `/bookshops/${decodedState}/${decodedCounty}` },
        ]}
      />
      
      <h1 className="text-3xl font-bold mt-6 mb-4">
        Bookshops in {displayCountyName}, {displayStateName}
      </h1>
      
      <p className="mb-6 text-lg">
        Explore independent bookstores in {displayCountyName} County. 
        Browse by city or view all {bookshopsInCounty.length} bookshops in the county.
      </p>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Cities in {displayCountyName} County</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {citiesInCounty.map(city => {
            const cityBookshops = bookshopsInCounty.filter(b => b.city === city);
            return (
              <Link 
                key={city} 
                href={createCityDirectoryUrlWithCounty(stateAbbreviation, decodedCounty, city)}
                className="flex items-center justify-between p-3 bg-white hover:bg-gray-50 border rounded-lg"
              >
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-primary" />
                  <span>{city}</span>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <span>{cityBookshops.length} {cityBookshops.length === 1 ? 'bookshop' : 'bookshops'}</span>
                  <ChevronRight className="h-4 w-4 ml-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
      
      <Separator className="my-8" />
      
      <div>
        <h2 className="text-xl font-semibold mb-6">
          All Bookshops in {displayCountyName} County
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookshopsInCounty.map(bookshop => (
            <BookshopCard 
              key={bookshop.id} 
              bookstore={bookshop}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CountyDirectory;