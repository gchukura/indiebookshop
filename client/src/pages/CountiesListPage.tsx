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
        // Get all states first
        const statesResponse = await fetch('/api/states');
        if (!statesResponse.ok) {
          throw new Error('Failed to fetch states');
        }
        const states = await statesResponse.json();

        // For each state, fetch the counties
        const countiesData: CountyByState[] = [];
        for (const state of states) {
          const countiesResponse = await fetch(`/api/states/${state}/counties`);
          if (!countiesResponse.ok) {
            console.warn(`Failed to fetch counties for state ${state}`);
            continue;
          }

          const counties = await countiesResponse.json();
          if (counties && counties.length > 0) {
            countiesData.push({
              state,
              counties
            });
          }
        }

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
      
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#3d6a80] mb-6">
          Independent Bookshops by County
        </h1>
        
        <p className="text-gray-700 mb-8">
          Browse our directory of independent bookshops organized by county. Find local bookstores in your county or discover 
          new places to explore in counties across America.
        </p>
        
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
          <div className="grid grid-cols-1 gap-6">
            {countiesByState.map(stateData => (
              <Card key={stateData.state} className="overflow-hidden border border-gray-200">
                <CardHeader className="bg-[#F7F3E8] py-4">
                  <CardTitle className="text-xl font-serif text-[#3d6a80]">
                    Counties in {stateData.state}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {stateData.counties.map(county => (
                      <Link
                        key={`${stateData.state}-${county}`}
                        to={`/directory/county-state/${generateSlug(county)}-${generateSlug(stateData.state)}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline py-1"
                      >
                        {county} County
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        <div className="mt-10 mb-4 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-serif font-bold text-[#3d6a80] mb-4">
            About Our County Bookshops Directory
          </h2>
          <p className="mb-4">
            Our county-based directory makes it easier to find independent bookshops in your local area or 
            when traveling. Counties often represent distinct cultural regions with their own unique literary scenes.
          </p>
          <p>
            Each county page provides a curated list of independent bookshops, their locations, special features, 
            and upcoming events. Whether you're looking for bookstores with coffee shops, rare book collections, or 
            children's book selections, our directory helps you find the perfect local bookshop.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CountiesListPage;