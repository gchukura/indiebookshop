import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Hero from "@/components/Hero";
import { Bookstore, Feature } from "@shared/schema";
import BookstoreIcon from "@/components/BookstoreIcon";

const Home = () => {
  // Fetch featured bookstores
  const { data: bookstores, isLoading } = useQuery<Bookstore[]>({
    queryKey: ["/api/bookstores"],
  });

  // Fetch features for the bookstore cards
  const { data: features } = useQuery<Feature[]>({
    queryKey: ["/api/features"],
  });

  // Get a limited set of featured bookstores
  const featuredBookstores = bookstores?.slice(0, 3) || [];

  return (
    <div>
      <Hero />
      
      {/* Featured Bookstores Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-bold text-[#5F4B32] mb-4">Featured Bookstores</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Discover these unique independent bookshops that offer exceptional
              literary experiences across the United States.
            </p>
          </div>
          
          {/* Featured section with border */}
          <div className="border-2 border-[#f7f3e8] rounded-lg p-8 mb-8 shadow-sm">
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
          
          {/* "Explore All Bookstores" button removed */}
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
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {/* This would dynamically populate from API data in production */}
            {["California", "New York", "Texas", "Oregon", "Washington", "Colorado", "Massachusetts", "Illinois", "Florida", "Pennsylvania"].map((state) => (
              <Link key={state} href={`/directory?state=${state}`}>
                <div className="bg-white rounded-lg p-4 text-center shadow-sm hover:shadow-md transition-shadow duration-200">
                  <span className="font-serif font-medium text-[#5F4B32]">{state}</span>
                </div>
              </Link>
            ))}
            
            <Link href="/directory">
              <div className="bg-[#E16D3D]/10 rounded-lg p-4 text-center shadow-sm hover:shadow-md transition-shadow duration-200">
                <span className="font-serif font-medium text-[#E16D3D]">View All States</span>
              </div>
            </Link>
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
