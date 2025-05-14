import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, useCallback } from "react";
import Hero from "@/components/Hero";
import { Bookstore as Bookshop, Feature } from "@shared/schema";
import BookshopIcon from "@/components/BookshopIcon";
import MapboxMap from "@/components/MapboxMap";
import BookshopDetail from "@/components/BookshopDetail";

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
  // State to track the countdown to next refresh (in seconds)
  const [refreshCountdown, setRefreshCountdown] = useState(30);
  // State to show a brief animation when bookshops are refreshed
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // State for the interactive map
  const [selectedBookshopId, setSelectedBookshopId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  // Handle bookshop selection from the map
  const handleSelectBookshop = (id: number) => {
    setSelectedBookshopId(id);
    setIsDetailOpen(true);
  };
  
  // Function to get random bookshops
  const getRandomBookshops = useCallback((): Bookshop[] => {
    if (!bookshops || bookshops.length === 0) return [];
    
    // Make a copy of the bookshops array to avoid mutating the original
    const shuffled = [...bookshops];
    
    // Fisher-Yates shuffle algorithm
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // Return the first 3 bookshops
    return shuffled.slice(0, 3);
  }, [bookshops]);
  
  // Set initial featured bookshops when data is loaded
  useEffect(() => {
    if (bookshops && bookshops.length > 0) {
      setFeaturedBookshops(getRandomBookshops());
    }
  }, [bookshops, getRandomBookshops]);
  
  // Update featured bookshops periodically (every 30 seconds)
  useEffect(() => {
    // Only set up interval if we have bookshops
    if (!bookshops || bookshops.length === 0) return;
    
    // Set up 1-second interval for countdown
    const countdownInterval = setInterval(() => {
      setRefreshCountdown(prev => {
        // When countdown reaches 0, refresh bookshops and reset countdown
        if (prev <= 1) {
          setIsRefreshing(true);
          setFeaturedBookshops(getRandomBookshops());
          
          // Reset the refreshing animation after 1 second
          setTimeout(() => setIsRefreshing(false), 1000);
          
          return 30; // Reset to 30 seconds
        }
        return prev - 1;
      });
    }, 1000);
    
    // Clean up interval on unmount
    return () => clearInterval(countdownInterval);
  }, [bookshops, getRandomBookshops]);

  return (
    <div>
      {/* Bookshop Detail Modal */}
      {selectedBookshopId && (
        <BookshopDetail
          bookshopId={selectedBookshopId}
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
        />
      )}
      
      {/* Hero Section */}
      <Hero />
      
      {/* Interactive Map Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-[500px] rounded-lg overflow-hidden shadow-lg border border-[#E3E9ED] mb-8">
            {bookshops && (
              <MapboxMap 
                bookstores={bookshops} 
                onSelectBookshop={handleSelectBookshop} 
              />
            )}
          </div>
        </div>
      </section>
      
      {/* Featured Bookshops Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Featured section with border and heading that intersects with the border */}
          <div className="mb-8">
            {/* Full border box with top border and heading that intersects */}
            <div className={`relative border-4 border-[#2A6B7C] rounded-lg p-8 pt-6 shadow-sm transition-all duration-300 ${isRefreshing ? 'bg-[rgba(42,107,124,0.05)]' : ''}`}>
              {/* Heading centered on the top border */}
              <div className="absolute -top-5 left-0 w-full flex justify-center">
                <h2 className="inline-block bg-white px-5 text-3xl font-serif font-bold text-[#5F4B32]">
                  ⭐ Featured Bookshops
                </h2>
              </div>
            
              {isLoading ? (
                <div className="text-center py-10">
                  <p>Loading featured bookshops...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {featuredBookshops.map((bookshop) => {
                    // Get feature names for this bookshop
                    const bookshopFeatures = features?.filter(feature => 
                      bookshop.featureIds && bookshop.featureIds.includes(feature.id)
                    ).slice(0, 3) || [];
                    
                    return (
                      <div key={bookshop.id} className="bg-white rounded-lg shadow-md overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg">
                        <Link href={`/bookshop/${bookshop.id}`}>
                          {bookshop.imageUrl ? (
                            <img 
                              src={bookshop.imageUrl} 
                              alt={bookshop.name}
                              className="w-full h-48 object-cover cursor-pointer" 
                            />
                          ) : (
                            <div className="w-full h-48 flex items-center justify-center">
                              <BookshopIcon size={150} className="cursor-pointer" />
                            </div>
                          )}
                        </Link>
                        <div className="p-6">
                          <Link href={`/bookshop/${bookshop.id}`}>
                            <h3 className="font-serif font-bold text-xl text-[#5F4B32] mb-2 cursor-pointer hover:text-[#E16D3D]">{bookshop.name}</h3>
                          </Link>
                          <p className="text-sm text-gray-600 mb-4">{bookshop.city}, {bookshop.state}</p>
                          <p className="text-gray-700 mb-4 line-clamp-3">{bookshop.description}</p>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {bookshopFeatures.map(feature => (
                              <span key={feature.id} className="bg-[rgba(42,107,124,0.1)] text-[#2A6B7C] rounded-full px-3 py-1 text-xs font-semibold">
                                {feature.name}
                              </span>
                            ))}
                          </div>
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
      <section className="py-16 bg-[#F7F3E8]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-bold text-[#5F4B32] mb-4">Browse by State</h2>
          </div>
          
          {/* States List - simple 5 column layout without white background */}
          <div className="p-2">
            {/* Fetch states from API instead of hardcoded list */}
            {isLoading ? (
              <div className="text-center py-6">
                <p>Loading states...</p>
              </div>
            ) : (
              <div className="flex flex-col space-y-6">
                {/* Get all unique states from bookshops array and sort alphabetically */}
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
                    // Include Canadian provinces as they appear in the data
                    'BC': 'British Columbia', 'ON': 'Ontario', 'QC': 'Quebec',
                    'AB': 'Alberta', 'MB': 'Manitoba', 'NS': 'Nova Scotia',
                    'NB': 'New Brunswick', 'SK': 'Saskatchewan',
                    // Include other territories and regions
                    'HM': 'Heard and McDonald Islands',
                    'VI': 'Virgin Islands',
                    // Fix for the erroneous "OK Input: CA Output: California" entry
                    'OK Input: CA Output: California': 'California'
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
                    .filter(abbr => !usStateAbbreviations.includes(abbr))
                    .map(abbr => ({
                      abbreviation: abbr,
                      fullName: stateMap[abbr] || abbr
                    }))
                    .sort((a, b) => a.fullName.localeCompare(b.fullName));
                  
                  return (
                    <>
                      {/* United States section */}
                      <div>
                        <h3 className="text-xl font-serif font-bold text-[#5F4B32] mb-4">
                          United States
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
                          <h3 className="text-xl font-serif font-bold text-[#5F4B32] mb-4">
                            Other Regions
                          </h3>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
      </section>
      
      {/* Why Independent Bookstores Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:flex lg:items-center lg:space-x-12">
            <div className="lg:w-1/2 mb-8 lg:mb-0">
              <h2 className="text-3xl font-serif font-bold text-[#5F4B32] mb-4">Why Support Independent Bookshops?</h2>
              <p className="text-gray-700 mb-6">
                Independent bookshops are vital cultural hubs that foster community connections, support local economies, and celebrate the diversity of literature. Each shop has its own unique character, curated selection, and knowledgeable staff that big-box retailers can't match.
              </p>
              <p className="text-gray-700 mb-6">
                By shopping at indie bookshops, you're not just buying books—you're investing in your community, supporting small businesses, and helping to maintain vibrant, diverse literary spaces for everyone.
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
      </section>
    </div>
  );
};

export default Home;