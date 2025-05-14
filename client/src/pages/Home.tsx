import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, useCallback } from "react";
import Hero from "@/components/Hero";
import { Bookstore, Feature } from "@shared/schema";
import BookstoreIcon from "@/components/BookstoreIcon";

const Home = () => {
  // Fetch all bookstores
  const { data: bookstores, isLoading } = useQuery<Bookstore[]>({
    queryKey: ["/api/bookstores"],
  });

  // Fetch features for the bookstore cards
  const { data: features } = useQuery<Feature[]>({
    queryKey: ["/api/features"],
  });
  
  // State to hold current featured bookstores
  const [featuredBookstores, setFeaturedBookstores] = useState<Bookstore[]>([]);
  // State to track the countdown to next refresh (in seconds)
  const [refreshCountdown, setRefreshCountdown] = useState(30);
  // State to show a brief animation when bookstores are refreshed
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Function to get random bookstores
  const getRandomBookstores = useCallback(() => {
    if (!bookstores || bookstores.length === 0) return [];
    
    // Make a copy of the bookstores array to avoid mutating the original
    const shuffled = [...bookstores];
    
    // Fisher-Yates shuffle algorithm
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // Return the first 3 bookstores
    return shuffled.slice(0, 3);
  }, [bookstores]);
  
  // Set initial featured bookstores when data is loaded
  useEffect(() => {
    if (bookstores && bookstores.length > 0) {
      setFeaturedBookstores(getRandomBookstores());
    }
  }, [bookstores, getRandomBookstores]);
  
  // Update featured bookstores periodically (every 30 seconds)
  useEffect(() => {
    // Only set up interval if we have bookstores
    if (!bookstores || bookstores.length === 0) return;
    
    // Set up 1-second interval for countdown
    const countdownInterval = setInterval(() => {
      setRefreshCountdown(prev => {
        // When countdown reaches 0, refresh bookstores and reset countdown
        if (prev <= 1) {
          setIsRefreshing(true);
          setFeaturedBookstores(getRandomBookstores());
          
          // Reset the refreshing animation after 1 second
          setTimeout(() => setIsRefreshing(false), 1000);
          
          return 30; // Reset to 30 seconds
        }
        return prev - 1;
      });
    }, 1000);
    
    // Clean up interval on unmount
    return () => clearInterval(countdownInterval);
  }, [bookstores, getRandomBookstores]);

  return (
    <div>
      <Hero />
      
      {/* Featured Bookstores Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Featured section with border and heading that intersects with the border */}
          <div className="mb-8">
            {/* Full border box with top border and heading that intersects */}
            <div className={`relative border-4 border-[#2A6B7C] rounded-lg p-8 pt-6 shadow-sm transition-all duration-300 ${isRefreshing ? 'bg-[rgba(42,107,124,0.05)]' : ''}`}>
              {/* Heading centered on the top border */}
              <div className="absolute -top-5 left-0 w-full flex justify-center">
                <h2 className="inline-block bg-white px-5 text-3xl font-serif font-bold text-[#5F4B32]">
                  ⭐ Featured Bookstores
                </h2>
              </div>
            
              {isLoading ? (
                <div className="text-center py-10">
                  <p>Loading featured bookstores...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {featuredBookstores.map((bookstore) => {
                    // Get feature names for this bookstore
                    const bookstoreFeatures = features?.filter(feature => 
                      bookstore.featureIds && bookstore.featureIds.includes(feature.id)
                    ).slice(0, 3) || [];
                    
                    return (
                      <div key={bookstore.id} className="bg-white rounded-lg shadow-md overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg">
                        <Link href={`/bookstore/${bookstore.id}`}>
                          {bookstore.imageUrl ? (
                            <img 
                              src={bookstore.imageUrl} 
                              alt={bookstore.name}
                              className="w-full h-48 object-cover cursor-pointer" 
                            />
                          ) : (
                            <div className="w-full h-48 flex items-center justify-center">
                              <BookstoreIcon size={150} className="cursor-pointer" />
                            </div>
                          )}
                        </Link>
                        <div className="p-6">
                          <Link href={`/bookstore/${bookstore.id}`}>
                            <h3 className="font-serif font-bold text-xl text-[#5F4B32] mb-2 cursor-pointer hover:text-[#E16D3D]">{bookstore.name}</h3>
                          </Link>
                          <p className="text-sm text-gray-600 mb-4">{bookstore.city}, {bookstore.state}</p>
                          <p className="text-gray-700 mb-4 line-clamp-3">{bookstore.description}</p>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {bookstoreFeatures.map(feature => (
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
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Find independent bookstores in your state or explore literary havens across the country.
            </p>
          </div>
          
          {/* States List with organized layout */}
          <div className="bg-white rounded-lg p-8 shadow-sm">
            {/* Fetch states from API instead of hardcoded list */}
            {isLoading ? (
              <div className="text-center py-6">
                <p>Loading states...</p>
              </div>
            ) : (
              <div className="flex flex-wrap justify-center">
                {/* Get all unique states from bookstores array, organize alphabetically */}
                {bookstores && (() => {
                  // Get unique states and sort them
                  const states = Array.from(new Set(bookstores.map(b => b.state)))
                    .filter(state => state) // Filter out null/undefined
                    .sort();
                  
                  // Group states by first letter for organized display
                  const statesByLetter: {[key: string]: string[]} = {};
                  states.forEach(state => {
                    const firstLetter = state.charAt(0).toUpperCase();
                    if (!statesByLetter[firstLetter]) {
                      statesByLetter[firstLetter] = [];
                    }
                    statesByLetter[firstLetter].push(state);
                  });
                  
                  // Return the JSX with organized groups
                  return Object.keys(statesByLetter).sort().map(letter => (
                    <div key={letter} className="m-2 p-3 min-w-[180px]">
                      <div className="text-lg font-bold text-[#5F4B32] mb-2 pb-1 border-b border-[#5F4B32]/20">
                        {letter}
                      </div>
                      <div className="flex flex-col space-y-2">
                        {statesByLetter[letter].map(state => (
                          <Link key={state} href={`/directory?state=${state}`}>
                            <span className="inline-block font-serif font-bold text-[#2A6B7C] hover:text-[#E16D3D] transition-colors">
                              {state}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ));
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
              <h2 className="text-3xl font-serif font-bold text-[#5F4B32] mb-4">Why Support Independent Bookstores?</h2>
              <p className="text-gray-700 mb-6">
                Independent bookstores are vital cultural hubs that foster community connections, support local economies, and celebrate the diversity of literature. Each store has its own unique character, curated selection, and knowledgeable staff that big-box retailers can't match.
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