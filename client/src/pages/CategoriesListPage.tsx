import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Feature } from "@shared/schema";
import { useMemo } from "react";
import { SEO } from "../components/SEO";
import { BASE_URL, PAGE_KEYWORDS } from "../lib/seo";

const CategoriesListPage = () => {
  // Fetch all features
  const { data: features = [], isLoading: featuresLoading } = useQuery<Feature[]>({
    queryKey: ["/api/features"],
  });
  
  // SEO metadata
  const seoTitle = useMemo(() => {
    return "Browse Bookshops by Category | Find Specialty Independent Bookstores";
  }, []);
  
  const seoDescription = useMemo(() => {
    return "Discover independent bookshops by specialty or feature. Find bookstores with coffee shops, rare books, children's sections, reading spaces, and more unique amenities to enhance your book shopping experience.";
  }, []);
  
  const seoKeywords = useMemo(() => {
    // Base keywords
    const baseKeywords = [
      "bookshops by category",
      "specialty bookstores",
      "independent bookshops by feature",
      "indie bookstores with amenities",
      "bookshops with special features",
      "bookstores with coffee shops",
      "rare book bookshops",
      "children's book stores",
      "bookstores with reading spaces",
      "specialty independent bookshops"
    ];
    
    // Add feature-specific keywords
    const featureKeywords = features.flatMap(feature => [
      `bookshops with ${feature.name.toLowerCase()}`,
      `bookstores featuring ${feature.name.toLowerCase()}`,
      `independent bookshops with ${feature.name.toLowerCase()}`
    ]);
    
    return [...baseKeywords, ...featureKeywords];
  }, [features]);
  
  const canonicalUrl = useMemo(() => {
    return `${BASE_URL}/categories`;
  }, []);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* SEO Component */}
      <SEO 
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        canonicalUrl={canonicalUrl}
      />
      
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-[#5F4B32] mb-4">
          Browse Independent Bookshops by Category & Special Features
        </h1>
        <p className="text-gray-600 mb-6">
          Discover unique independent bookshops offering specialized features and amenities. Select a category to see all indie bookstores that provide these special offerings.
        </p>
      </div>

      {featuresLoading ? (
        <div className="text-center py-10">
          <p className="text-base">Loading categories...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-serif font-bold text-[#5F4B32] mb-4">
            Independent Bookshop Categories & Special Features
          </h2>
          <p className="text-gray-600 mb-6">
            Select a category below to find indie bookshops with that special feature or amenity. From coffee shops to rare book collections, discover bookstores that offer exactly what you're looking for.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {features.map(feature => (
              <Link 
                key={feature.id} 
                href={`/directory/category/${feature.id}`}
                title={`Find independent bookshops with ${feature.name}`}
              >
                <Button 
                  variant="outline" 
                  className="w-full h-24 flex flex-col justify-center items-center font-medium hover:bg-[#2A6B7C]/5 hover:text-[#2A6B7C] hover:border-[#2A6B7C] transition-colors"
                  aria-label={`Browse indie bookshops with ${feature.name}`}
                >
                  <span className="text-lg">{feature.name}</span>
                  <span className="text-xs text-gray-500 mt-1">View Bookshops</span>
                </Button>
              </Link>
            ))}
          </div>
        </div>
      )}
      
      {/* SEO-friendly content section */}
      <section className="py-8 md:py-12 lg:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#F7F3E8] rounded-lg p-6 md:p-8 lg:p-10">
        <h2 className="text-2xl font-serif font-bold text-[#5F4B32] mb-4">
          Discover Bookshops by Special Features
        </h2>
        <div className="prose prose-p:text-gray-700 max-w-none">
          <p>
            Independent bookshops are more than just places to buy books—they're community hubs offering unique experiences that online retailers simply can't match. Many indie bookstores have special features that transform them into destinations worth seeking out.
          </p>
          <p>
            Looking for a cozy reading nook? Many independent bookshops offer comfortable seating areas where you can sample books before purchasing. Need a caffeine fix with your literature? Find bookstores with in-house coffee shops where you can sip a latte while browsing the shelves.
          </p>
          <p>
            Collectors will appreciate our category listings for rare books and first editions. Families can easily locate bookshops with dedicated children's sections that host storytimes and other kid-friendly events. Literary enthusiasts can discover bookstores that regularly hold author readings, book clubs, and writing workshops.
          </p>
          <p>
            By browsing our bookshop directory by category, you can find exactly the type of independent bookstore experience you're looking for. Each listing includes details about the shop's special features, ensuring you'll find the perfect literary destination for your next visit.
          </p>
        </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CategoriesListPage;