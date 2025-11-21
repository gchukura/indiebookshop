import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Bookstore as Bookshop, Feature } from "@shared/schema";
import BookshopIcon from "@/components/BookshopIcon";
import { SEO } from "../components/SEO";
import { 
  BASE_URL, 
  PAGE_KEYWORDS,
  DESCRIPTION_TEMPLATES 
} from "../lib/seo";
import { generateSlugFromName } from "../lib/linkUtils";
import { Button } from "@/components/ui/button";

const Home = () => {
  // Fetch all bookshops
  const { data: bookshops, isLoading } = useQuery<Bookshop[]>({
    queryKey: ["/api/bookstores"],
  });

  // Fetch features for the bookshop cards
  const { data: features } = useQuery<Feature[]>({
    queryKey: ["/api/features"],
  });
  
  // State to hold current featured bookshops
  const [featuredBookshops, setFeaturedBookshops] = useState<Bookshop[]>([]);
  
  // SEO metadata for the homepage
  const seoTitle = useMemo(() => {
    return "IndiebookShop.com | Find Independent Bookshops Across America";
  }, []);
  
  const seoDescription = useMemo(() => {
    return "Explore over 2,000 independent bookshops across all 50 states. Search by location, browse by specialty, or discover shops near you on our interactive map.";
  }, []);
  
  const seoKeywords = useMemo(() => {
    return [
      "independent bookshops",
      "indie bookstores",
      "local bookshops",
      "find bookshops",
      "bookstore directory",
      "indie bookshop map",
      "bookshops near me",
      "local booksellers",
      "independent bookstores directory",
      "support local bookshops",
      "indie bookshop finder",
      "bookstore events",
      "literary community",
      "book lovers guide",
      "browse indie bookshops",
      ...PAGE_KEYWORDS.home.additionalKeywords
    ];
  }, []);
  
  const canonicalUrl = useMemo(() => {
    return BASE_URL;
  }, []);
  
  // Function to get featured bookshops - always show 6
  // Uses deterministic sorting to prevent SSR/client hydration mismatches
  const getFeaturedBookshops = useCallback((): Bookshop[] => {
    if (!bookshops || bookshops.length === 0) return [];
    
    // Prioritize shops with images, but show 6 regardless
    const withImages = bookshops.filter(shop => shop.imageUrl);
    const withoutImages = bookshops.filter(shop => !shop.imageUrl);
    
    // Sort deterministically by ID to ensure consistent results on server and client
    // This prevents React hydration mismatches that would occur with random shuffling
    const sortedWithImages = [...withImages].sort((a, b) => a.id - b.id);
    const sortedWithoutImages = [...withoutImages].sort((a, b) => a.id - b.id);
    
    // Combine: prioritize those with images, then add others to reach 6
    const featured = [...sortedWithImages, ...sortedWithoutImages].slice(0, 6);
    
    return featured;
  }, [bookshops]);
  
  // Set featured bookshops when data is loaded (once, not on interval)
  useEffect(() => {
    if (bookshops && bookshops.length > 0) {
      setFeaturedBookshops(getFeaturedBookshops());
    }
  }, [bookshops, getFeaturedBookshops]);
  
  // Smooth scroll handler
  const scrollToElement = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div>
      {/* SEO Component */}
      <SEO 
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        canonicalUrl={canonicalUrl}
      />
      
      {/* Hero Section - Updated */}
      <section className="bg-[#5F4B32] py-12 md:py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="font-serif text-3xl md:text-4xl lg:text-display font-bold text-white mb-4 md:mb-6">
              Find Independent Bookshops Across North America
            </h1>
            <p className="font-sans text-base md:text-body-lg text-gray-100 mb-8 md:mb-10 max-w-4xl mx-auto px-4 md:px-2">
              Explore over 2,000 independent bookshops in all 50 U.S. states and Canada. Search by location, browse by specialty, or discover shops near you on our interactive map.
            </p>
            
            {/* Primary CTA */}
            <div className="mb-6 w-full sm:w-auto">
              <Link href="/directory" className="block sm:inline-block">
                <Button 
                  className="bg-[#E16D3D] hover:bg-[#d06a4f] text-white rounded-full px-8 md:px-10 py-4 md:py-5 text-lg md:text-xl font-semibold min-h-[56px] shadow-lg w-full sm:w-auto"
                >
                  Start Exploring →
                </Button>
              </Link>
            </div>
            
            {/* Secondary CTA */}
            <div className="text-center">
              <Link href="/submit">
                <button className="text-gray-100 hover:text-white underline text-sm md:text-base">
                  Own a bookshop? Add or update your listing
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>
      
      {/* Quick Entry Points Section - NEW */}
      <section className="py-8 md:py-12 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#5F4B32] mb-8 text-center">
              Start Your Search
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* By Location */}
              <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow border-2 border-transparent hover:border-[#2A6B7C] flex flex-col">
                <div className="text-4xl mb-4">📍</div>
                <h3 className="font-serif font-bold text-xl text-[#5F4B32] mb-3">
                  Search by Location
                </h3>
                <p className="text-gray-700 mb-4 text-sm flex-grow">
                  Find bookshops near you or in cities you're visiting
                </p>
                <Link href="/directory" className="mt-auto block sm:inline-block w-full sm:w-auto">
                  <Button 
                    className="w-full sm:w-auto bg-[#2A6B7C] hover:bg-[#1d5a6a] text-white rounded-full"
                  >
                    Open Map & Filters
                  </Button>
                </Link>
              </div>
              
              {/* By State */}
              <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow border-2 border-transparent hover:border-[#2A6B7C] flex flex-col">
                <div className="text-4xl mb-4">🗺️</div>
                <h3 className="font-serif font-bold text-xl text-[#5F4B32] mb-3">
                  Browse by State
                </h3>
                <p className="text-gray-700 mb-4 text-sm flex-grow">
                  Explore all bookshops state by state
                </p>
                <div className="mt-auto w-full sm:w-auto">
                  <Button 
                    onClick={() => scrollToElement('browse-by-state')}
                    className="w-full sm:w-auto bg-[#2A6B7C] hover:bg-[#1d5a6a] text-white rounded-full"
                  >
                    See All States
                  </Button>
                </div>
              </div>
              
              {/* Featured/Discover */}
              <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow border-2 border-transparent hover:border-[#2A6B7C] flex flex-col">
                <div className="text-4xl mb-4">✨</div>
                <h3 className="font-serif font-bold text-xl text-[#5F4B32] mb-3">
                  Discover Featured Shops
                </h3>
                <p className="text-gray-700 mb-4 text-sm flex-grow">
                  Browse curated selections from our directory
                </p>
                <div className="mt-auto w-full sm:w-auto">
                  <Button 
                    onClick={() => scrollToElement('featured-bookshops')}
                    className="w-full sm:w-auto bg-[#2A6B7C] hover:bg-[#1d5a6a] text-white rounded-full"
                  >
                    View Featured
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Trust/Stats Bar - NEW */}
      <section className="py-8 bg-white border-y border-gray-200">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center max-w-4xl mx-auto">
            <div>
              <div className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-[#E16D3D] mb-2">2,000+</div>
              <div className="text-gray-700 font-medium">Independent Bookshops</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-[#E16D3D] mb-2">50</div>
              <div className="text-gray-700 font-medium">States Covered</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-[#E16D3D] mb-2">Growing</div>
              <div className="text-gray-700 font-medium">Updated Weekly</div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Featured Bookshops Section - Updated */}
      <section id="featured-bookshops" className="py-8 md:py-12 lg:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg p-6 md:p-8 lg:p-10">
            <div className="relative border-4 border-[#2A6B7C] rounded-lg p-4 md:p-6 lg:p-8 pt-8 md:pt-6 lg:pt-8 shadow-sm bg-[#2A6B7C]/5">
              <div className="absolute -top-4 md:-top-5 left-0 w-full flex justify-center px-2">
                <h2 className="inline-block bg-white px-2 md:px-5 text-lg md:text-2xl lg:text-3xl font-serif font-bold text-[#5F4B32] text-center">
                  Featured Bookshops
                </h2>
              </div>
              <p className="text-center text-sm md:text-base lg:text-lg text-gray-700 mb-4 md:mb-6 lg:mb-8 mt-2 md:mt-0 px-2">
                Discover standout indie bookshops from across our directory. Each offers unique character and community connection.
              </p>
            
              {isLoading ? (
                <div className="text-center py-10">
                  <p className="text-base">Loading featured bookshops...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
                  {featuredBookshops.map((bookshop) => {
                    // Get feature names for this bookshop
                    const bookshopFeatures = features?.filter(feature => 
                      bookshop.featureIds && bookshop.featureIds.includes(feature.id)
                    ).slice(0, 3) || [];
                    
                    const bookshopSlug = generateSlugFromName(bookshop.name);
                    
                    return (
                      <div key={bookshop.id} className="bg-white rounded-lg shadow-md overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg">
                        <Link href={`/bookshop/${bookshopSlug}`}>
                          {bookshop.imageUrl ? (
                            <img 
                              src={bookshop.imageUrl} 
                              alt={bookshop.name}
                              className="w-full h-36 sm:h-40 md:h-48 object-cover cursor-pointer" 
                            />
                          ) : (
                            <div className="w-full h-36 sm:h-40 md:h-48 flex items-center justify-center bg-gray-100">
                              <BookshopIcon size={120} className="cursor-pointer sm:w-[150px] sm:h-[150px]" />
                            </div>
                          )}
                        </Link>
                        <div className="p-4 md:p-5 lg:p-6">
                          <Link href={`/bookshop/${bookshopSlug}`}>
                            <h3 className="font-serif font-bold text-base md:text-lg lg:text-xl text-[#5F4B32] mb-2 cursor-pointer hover:text-[#E16D3D] leading-tight line-clamp-2">{bookshop.name}</h3>
                          </Link>
                          <p className="text-xs md:text-sm text-gray-600 mb-3 md:mb-4">{bookshop.city || ''}{bookshop.city && bookshop.state ? ', ' : ''}{bookshop.state || ''}</p>
                          {bookshop.description && (
                            <p className="text-sm md:text-base text-gray-700 mb-3 md:mb-4 line-clamp-3 leading-relaxed">{bookshop.description}</p>
                          )}
                          {bookshopFeatures.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 md:gap-2">
                              {bookshopFeatures.map(feature => (
                                <span key={feature.id} className="bg-[rgba(42,107,124,0.1)] text-[#2A6B7C] rounded-full px-2 md:px-3 py-0.5 md:py-1 text-xs font-semibold">
                                  {feature.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      
      {/* Browse by State Section */}
      <section id="browse-by-state" className="py-8 md:py-12 lg:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#F7F3E8] rounded-lg p-6 md:p-8 lg:p-10">
            <div className="relative border-4 border-[#2A6B7C] rounded-lg p-4 md:p-6 lg:p-8 pt-8">
              <div className="absolute -top-4 md:-top-5 left-0 w-full flex justify-center px-2">
                <h2 className="inline-block bg-[#F7F3E8] px-2 md:px-5 text-2xl md:text-3xl font-serif font-bold text-[#5F4B32] text-center">
                  Browse by State
                </h2>
              </div>
            
            <div className="mt-2 md:mt-0">
              {isLoading ? (
                <div className="text-center py-10">
                  <p className="text-base">Loading states...</p>
                </div>
              ) : (
                <div className="flex flex-col space-y-6">
                  {bookshops && (() => {
                    // State abbreviation to full name mapping
                    const stateMap: {[key: string]: string} = {
                      'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 
                      'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 
                      'DE': 'Delaware', 'DC': 'District of Columbia', 'FL': 'Florida', 
                      'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 
                      'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas', 'KY': 'Kentucky', 
                      'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland', 
                      'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 
                      'MS': 'Mississippi', 'MO': 'Missouri', 'MT': 'Montana', 
                      'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 
                      'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York', 
                      'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 
                      'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 
                      'RI': 'Rhode Island', 'SC': 'South Carolina', 'SD': 'South Dakota', 
                      'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont', 
                      'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 
                      'WI': 'Wisconsin', 'WY': 'Wyoming',
                      // Include Canadian provinces
                      'BC': 'British Columbia', 'ON': 'Ontario', 'QC': 'Quebec',
                      'AB': 'Alberta', 'MB': 'Manitoba', 'NS': 'Nova Scotia',
                      'NB': 'New Brunswick', 'SK': 'Saskatchewan',
                      // Include other territories
                      'HM': 'Heard and McDonald Islands',
                      'VI': 'Virgin Islands'
                    };
                    
                    // List of US state abbreviations
                    const usStateAbbreviations = [
                      'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 
                      'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 
                      'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 
                      'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 
                      'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
                    ];
                    
                    // Get unique states from bookshops
                    const stateAbbreviations = Array.from(new Set(bookshops.map((b: Bookshop) => b.state)))
                      .filter(state => state); // Filter out null/undefined
                    
                    // Separate US states from other regions
                    const usStates = stateAbbreviations
                      .filter((abbr: string) => usStateAbbreviations.includes(abbr))
                      .map((abbr: string) => ({
                        abbreviation: abbr,
                        fullName: stateMap[abbr] || abbr
                      }))
                      .sort((a, b) => a.fullName.localeCompare(b.fullName));
                    
                    const otherRegions = stateAbbreviations
                      .filter((abbr: string) => !usStateAbbreviations.includes(abbr))
                      .map((abbr: string) => ({
                        abbreviation: abbr,
                        fullName: stateMap[abbr] || abbr
                      }))
                      .sort((a, b) => a.fullName.localeCompare(b.fullName));
                    
                    return (
                      <>
                        {/* United States section */}
                        <div>
                          <h3 className="text-lg md:text-xl font-serif font-bold text-[#5F4B32] mb-3 md:mb-4">
                            United States
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
                            {usStates.map(state => (
                              <Link key={state.abbreviation} href={`/directory/state/${state.abbreviation}`}>
                                <span className="inline-block w-full font-serif font-bold text-[#2A6B7C] hover:text-[#E16D3D] transition-colors">
                                  {state.fullName}
                                </span>
                              </Link>
                            ))}
                          </div>
                        </div>
                        
                        {/* Only show Other Regions section if there are any */}
                        {otherRegions.length > 0 && (
                          <div>
                            <h3 className="text-lg md:text-xl font-serif font-bold text-[#5F4B32] mb-3 md:mb-4">
                              Other Regions
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
                              {otherRegions.map(region => (
                                <Link key={region.abbreviation} href={`/directory/state/${region.abbreviation}`}>
                                  <span className="inline-block w-full font-serif font-bold text-[#2A6B7C] hover:text-[#E16D3D] transition-colors">
                                    {region.fullName}
                                  </span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Why Independent Bookshops Section */}
      <section className="py-8 md:py-12 lg:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg p-6 md:p-8 lg:p-10">
            <div className="lg:flex lg:items-center lg:space-x-12">
              <div className="lg:w-1/2 mb-8 lg:mb-0">
                <h2 className="text-xl md:text-2xl font-serif font-bold text-[#5F4B32] mb-4">Why Support Independent Bookshops?</h2>
                <p className="text-gray-700 mb-6">
                  Independent bookshops are vital cultural hubs that foster community connections, support local economies, and celebrate the diversity of literature. Each shop has its own unique character, curated selection, and knowledgeable staff that big-box retailers can't match.
                </p>
                <p className="text-gray-700 mb-6">
                  By shopping at indie bookshops, you're not just buying books - you're investing in your community, supporting small businesses, and helping to maintain vibrant, diverse literary spaces for everyone.
                </p>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 text-[#2A6B7C]">✓</div>
                    <p className="ml-2 text-gray-700">Personalized recommendations from knowledgeable staff</p>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 text-[#2A6B7C]">✓</div>
                    <p className="ml-2 text-gray-700">Unique selection of titles you won't find at chain stores</p>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 text-[#2A6B7C]">✓</div>
                    <p className="ml-2 text-gray-700">Community events, book clubs, and author readings</p>
                  </div>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-6 w-6 text-[#2A6B7C]">✓</div>
                    <p className="ml-2 text-gray-700">Supporting local economies and creating jobs</p>
                  </div>
                </div>
              </div>
              <div className="lg:w-1/2">
                <div className="relative rounded-lg overflow-hidden shadow-xl h-96">
                  <img 
                    src="https://images.unsplash.com/photo-1519682337058-a94d519337bc?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&h=800" 
                    alt="Inside a cozy independent bookstore with wooden shelves and warm lighting"
                    className="absolute w-full h-full object-cover" 
                  />
                  <div className="absolute inset-0 bg-[#5F4B32]/20"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* SEO Content Section - Moved to bottom and updated */}
      <section className="py-8 md:py-12 lg:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#F7F3E8] rounded-lg p-6 md:p-8 lg:p-10">
            <div className="relative border-4 border-[#2A6B7C] rounded-lg p-4 md:p-6 lg:p-8 pt-8">
              <div className="absolute -top-4 md:-top-5 left-0 w-full flex justify-center px-2">
                <h2 className="inline-block bg-[#F7F3E8] px-2 md:px-5 text-2xl md:text-3xl font-serif font-bold text-[#5F4B32] text-center">
                  America's Most Comprehensive Independent Bookshop Directory
                </h2>
              </div>
              <div className="prose prose-lg prose-p:text-gray-700 mx-auto mt-2 md:mt-0">
                <p>
                  IndiebookShop.com features over 2,000 independent bookshops across all 50 states - the most comprehensive 
                  directory of indie bookshops available. Our searchable database connects book lovers with local independent 
                  booksellers, helping you discover unique literary spaces in your neighborhood or while traveling.
                </p>
                <p>
                  Independent bookshops are vital cultural hubs that foster community, support local economies, and celebrate 
                  the diversity of literature. Each indie bookshop offers a unique experience that goes beyond the transactional 
                  nature of large chain stores or online retailers.
                </p>
                <p>
                  Use our interactive map to find indie bookshops near you, browse by state to plan your next literary road trip, 
                  or explore featured shops to discover bookshops with unique character and expert curation. We're continuously 
                  adding new bookshops and enriching profiles with photos, features, and community details.
                </p>
                <p>
                  Support local independent bookshops by visiting them in person, attending their events, and spreading the word. 
                  When you shop at an indie bookshop, you're investing in your local literary ecosystem and helping preserve the 
                  unique character of your community.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;