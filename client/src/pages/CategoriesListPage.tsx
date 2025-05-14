import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Feature } from "@shared/schema";

const CategoriesListPage = () => {
  // Fetch all features
  const { data: features = [], isLoading: featuresLoading } = useQuery<Feature[]>({
    queryKey: ["/api/features"],
  });

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-[#5F4B32] mb-4">
          By Category
        </h1>
        <p className="text-gray-600 mb-6">
          Find independent bookstores offering specific features and specialties. Select a category to see all bookstores that offer it.
        </p>
      </div>

      {featuresLoading ? (
        <div className="text-center py-10">
          <p>Loading categories...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {features.map(feature => (
              <Link 
                key={feature.id} 
                href={`/directory/category/${feature.id}`}
              >
                <Button 
                  variant="outline" 
                  className="w-full h-24 flex flex-col justify-center items-center font-medium hover:bg-[#2A6B7C]/5 hover:text-[#2A6B7C] hover:border-[#2A6B7C] transition-colors"
                >
                  <span className="text-lg">{feature.name}</span>
                  <span className="text-xs text-gray-500 mt-1">View Bookstores</span>
                </Button>
              </Link>
            ))}
          </div>
        </div>
      )}
      
      <div className="mt-8 bg-[#F7F3E8] rounded-lg p-6">
        <h2 className="text-xl font-serif font-bold text-[#5F4B32] mb-3">
          Why browse by category?
        </h2>
        <p className="text-gray-700 mb-4">
          Each independent bookstore offers unique features and specialties. Some have cozy cafés perfect for reading, others specialize in rare or used books, and many host regular author events and book clubs.
        </p>
        <p className="text-gray-700">
          By browsing bookstores by category, you can find the perfect bookshop that matches your specific interests and preferences.
        </p>
      </div>
    </div>
  );
};

export default CategoriesListPage;