import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SEO } from "../components/SEO";
import { BASE_URL } from "../lib/seo";

interface CountyByState {
  state: string;
  counties: string[];
}

const CountiesListPage = () => {
  const [countiesByState, setCountiesByState] = useState<CountyByState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCountiesByState = async () => {
      setIsLoading(true);
      try {
        // Since the API endpoints are experiencing issues, we'll use a different approach
        // Get all bookstores and extract county information directly
        const bookstoresResponse = await fetch('/api/bookstores');
        if (!bookstoresResponse.ok) {
          throw new Error('Failed to fetch bookstores');
        }
        const bookstores = await bookstoresResponse.json();
        
        // Extract unique state-county combinations
        const stateCountyMap = new Map<string, Set<string>>();
        
        bookstores.forEach((bookstore: any) => {
          if (bookstore.county && bookstore.county.trim() !== '' && bookstore.live !== false) {
            if (!stateCountyMap.has(bookstore.state)) {
              stateCountyMap.set(bookstore.state, new Set());
            }
            stateCountyMap.get(bookstore.state)?.add(bookstore.county);
          }
        });
        
        // Convert to CountyByState array
        const countiesData: CountyByState[] = [];
        stateCountyMap.forEach((counties, state) => {
          if (counties.size > 0) {
            countiesData.push({
              state,
              counties: Array.from(counties).sort()
            });
          }
        });
        
        // Sort states alphabetically
        countiesData.sort((a, b) => a.state.localeCompare(b.state));
        
        setCountiesByState(countiesData);
        setError(null);
      } catch (err) {
        console.error('Error fetching counties by state:', err);
        setError('Failed to load counties. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCountiesByState();
  }, []);

  // Helper to generate a clean URL slug
  const generateSlug = (text: string): string => {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <SEO 
        title="Bookshops by County | Find Independent Bookstores in Your County"
        description="Discover independent bookshops and local bookstores in your county. Browse our comprehensive directory organized by counties across all states."
        keywords={["bookshops by county", "local bookstores", "independent bookshops", "county bookshop directory", "find bookstore in county"]}
        canonicalUrl={`${BASE_URL}/directory/counties`}
      />
      
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#3d6a80] mb-4">
          Browse Bookshops by County
        </h1>
        
        <div className="bg-[#F7F3E8] p-4 md:p-6 rounded-lg mb-8">
          <p className="text-lg text-gray-800">
            Explore our directory of independent bookshops organized by county. Find local bookstores in your county 
            or discover new places to explore in counties across the United States and Canada.
          </p>
        </div>
        
        {/* Navigation links */}
        <div className="flex flex-wrap gap-3 mb-8">
          <Link to="/directory" className="text-blue-600 hover:text-blue-800 hover:underline">
            All Bookshops
          </Link>
          <span className="text-gray-400">•</span>
          <Link to="/directory/browse" className="text-blue-600 hover:text-blue-800 hover:underline">
            Bookshops by State
          </Link>
          <span className="text-gray-400">•</span>
          <Link to="/directory/cities" className="text-blue-600 hover:text-blue-800 hover:underline">
            Bookshops by City
          </Link>
          <span className="text-gray-400">•</span>
          <Link to="/directory/categories" className="text-blue-600 hover:text-blue-800 hover:underline">
            Bookshops by Category
          </Link>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-pulse text-center">
              <p className="text-lg">Loading counties...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-md p-6 text-center">
            <p className="text-red-700 mb-4">{error}</p>
            <Button 
              onClick={() => window.location.reload()}
              className="bg-[#2A6B7C] hover:bg-[#2A6B7C]/90 text-white"
            >
              Try Again
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {countiesByState.map(stateData => (
              <div key={stateData.state}>
                <h2 className="text-2xl font-serif text-[#3d6a80] border-b-2 border-[#F7F3E8] pb-2 mb-4">
                  Counties in {stateData.state}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-y-3 gap-x-4">
                  {stateData.counties.map(county => (
                    <Link
                      key={`${stateData.state}-${county}`}
                      to={`/directory/county/${stateData.state.toLowerCase()}/${generateSlug(county)}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {county} County 
                      <span className="text-gray-400 text-sm ml-1">
                        ({stateData.state})
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-12 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-serif font-bold text-[#3d6a80] mb-4">
            About Our County Bookshops Directory
          </h2>
          <p className="mb-4">
            Our county-based directory makes it easier to find independent bookshops in your local area or 
            when traveling. Counties often represent distinct cultural regions with their own unique literary scenes.
          </p>
          <p className="mb-4">
            Each county page provides a curated list of independent bookshops, their locations, special features, 
            and upcoming events. Whether you're looking for bookstores with coffee shops, rare book collections, or 
            children's book selections, our directory helps you find the perfect local bookshop.
          </p>
          <p>
            Our county directory complements our existing state and city directories, offering you multiple ways to 
            discover independent bookshops in your area. This additional organization helps readers find bookshops 
            that might be located in rural areas outside major cities but still within accessible counties.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CountiesListPage;