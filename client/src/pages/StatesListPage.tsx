import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Feature } from "@shared/schema";

const StatesListPage = () => {
  // Fetch all states
  const { data: states = [], isLoading: statesLoading } = useQuery<string[]>({
    queryKey: ["/api/states"],
  });

  // Fetch all features
  const { data: features = [], isLoading: featuresLoading } = useQuery<Feature[]>({
    queryKey: ["/api/features"],
  });

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-[#5F4B32] mb-4">
          Browse Bookstores by Location or Category
        </h1>
        <p className="text-gray-600 mb-8">
          Find independent bookstores across the country by state, city, or special features. Discover your next favorite bookshop!
        </p>
        
        {/* Breadcrumb Navigation */}
        <div className="flex items-center text-sm mb-6">
          <Link href="/directory">
            <span className="text-[#2A6B7C] hover:underline">Directory</span>
          </Link>
          <span className="mx-2">›</span>
          <span className="font-medium">Browse</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* States Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-serif font-bold text-[#5F4B32] mb-4">
            Browse by State
          </h2>
          
          {statesLoading ? (
            <div className="text-center py-10">
              <p>Loading states...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {states.map(state => (
                <Link 
                  key={state} 
                  href={`/directory/state/${state}`}
                >
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-left hover:bg-[#2A6B7C]/5 hover:text-[#2A6B7C] transition-colors"
                  >
                    {state}
                  </Button>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Features Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-serif font-bold text-[#5F4B32] mb-4">
            Browse by Feature
          </h2>
          
          {featuresLoading ? (
            <div className="text-center py-10">
              <p>Loading features...</p>
            </div>
          ) : (
            <div className="space-y-2">
              {features.map(feature => (
                <Link 
                  key={feature.id} 
                  href={`/directory/category/${feature.id}`}
                >
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-left hover:bg-[#2A6B7C]/5 hover:text-[#2A6B7C] transition-colors"
                  >
                    {feature.name}
                  </Button>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatesListPage;