import { useParams, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Bookstore, Feature } from "@shared/schema";
import BookshopCard from "@/components/BookshopCard";
import BookshopDetail from "@/components/BookshopDetail";
import MapboxMap from "@/components/MapboxMap";
import { Button } from "@/components/ui/button";
import { SEO } from "../components/SEO";
import { 
  BASE_URL, 
  DESCRIPTION_TEMPLATES, 
  generateSlug, 
  generateLocationKeywords, 
  generateDescription,
  PAGE_KEYWORDS
} from "../lib/seo";

const CategoryDirectory = () => {
  const { featureId } = useParams();
  const [selectedBookshopId, setSelectedBookshopId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [view, setView] = useState<"map" | "list">("map");
  const [_, navigate] = useLocation();
  
  // Fetch the feature information 
  const { data: features = [] } = useQuery<Feature[]>({
    queryKey: ["/api/features"],
  });
  
  const featureIdNum = parseInt(featureId || "0");
  const feature = features.find(f => f.id === featureIdNum);
  const featureName = feature?.name || "Category";
  
  // Fetch bookshops with this feature
  const { data: bookshops = [], isLoading, isError } = useQuery<Bookstore[]>({
    queryKey: [`/api/bookstores/filter?features=${featureId}`],
    enabled: !!featureId,
  });
  
  // Generate SEO metadata
  const seoTitle = useMemo(() => {
    return `${featureName} Bookshops | Indie Bookshops with ${featureName}`;
  }, [featureName]);
  
  const seoDescription = useMemo(() => {
    return generateDescription(
      DESCRIPTION_TEMPLATES.categories, 
      { category: featureName.toLowerCase() }
    );
  }, [featureName]);
  
  const seoKeywords = useMemo(() => {
    // For category pages, use a mix of category-specific keywords and main keywords
    const specialtyKeywords = [
      `${featureName} bookshops`,
      `bookshops with ${featureName}`,
      `independent bookshops with ${featureName}`,
      `indie bookshops with ${featureName}`,
      `bookstores specializing in ${featureName}`,
      `${featureName} specialty bookshops`,
      `best ${featureName} bookshops`,
      `find ${featureName} bookshops`
    ];
    
    return [...specialtyKeywords, ...PAGE_KEYWORDS.categories.additionalKeywords];
  }, [featureName]);
  
  const canonicalUrl = useMemo(() => {
    return `${BASE_URL}/directory/category/${featureIdNum}`;
  }, [featureIdNum]);

  const handleShowDetails = (id: number) => {
    // Find the bookshop by ID
    const bookshop = bookshops.find(b => b.id === id);
    
    if (bookshop) {
      // Navigate to the bookshop detail page using client-side navigation
      const slug = generateSlug(bookshop.name);
      navigate(`/bookshop/${slug}`);
    }
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
  };

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
        <h1 className="text-3xl font-serif font-bold text-[#5F4B32] mb-4">
          {featureName} Bookshops | Independent Bookshops with {featureName}
        </h1>
        <p className="text-gray-600 mb-6">
          Discover indie bookshops that specialize in {featureName.toLowerCase()}. Browse our comprehensive directory of bookshops with {featureName.toLowerCase()} using our interactive map or detailed list view.
        </p>
        
        {/* Breadcrumb Navigation */}
        <div className="flex items-center text-sm mb-6">
          <Link href="/directory">
            <span className="text-[#2A6B7C] hover:underline">Directory</span>
          </Link>
          <span className="mx-2">›</span>
          <Link href="/directory/categories">
            <span className="text-[#2A6B7C] hover:underline">Categories</span>
          </Link>
          <span className="mx-2">›</span>
          <span className="font-medium">{featureName} Bookshops</span>
        </div>
        
        {/* Toggle View */}
        <div className="flex space-x-2 mb-6">
          <Button 
            variant={view === "map" ? "default" : "outline"} 
            onClick={() => setView("map")}
            className={view === "map" ? "bg-[#2A6B7C] hover:bg-[#2A6B7C]/90" : ""}
            aria-label={`View ${featureName} bookshops on map`}
          >
            Map View
          </Button>
          <Button 
            variant={view === "list" ? "default" : "outline"} 
            onClick={() => setView("list")}
            className={view === "list" ? "bg-[#2A6B7C] hover:bg-[#2A6B7C]/90" : ""}
            aria-label={`View list of ${featureName} bookshops`}
          >
            List View
          </Button>
        </div>
      </div>

      <div className="md:flex md:space-x-6">
        {/* Map Section */}
        {view === "map" && (
          <div className="w-full md:w-1/2 mb-6 md:mb-0">
            <div className="bg-white rounded-lg shadow-md overflow-hidden map-container relative" style={{ height: "600px" }}>
              <MapboxMap 
                bookstores={bookshops} 
                onSelectBookshop={handleShowDetails}
              />
            </div>
          </div>
        )}

        {/* Bookshop Listings Section */}
        <div className={`w-full ${view === "map" ? "md:w-1/2" : "md:w-full"}`}>
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-xl font-serif font-bold text-[#5F4B32] mb-4">
              {bookshops.length} Independent Bookshops with {featureName}
            </h2>
            <h3 className="text-md text-gray-600 mb-3">
              Browse specialty bookshops offering {featureName.toLowerCase()} across America
            </h3>
            
            {isLoading ? (
              <div className="text-center py-10">
                <p>Loading {featureName.toLowerCase()} bookshops...</p>
              </div>
            ) : isError ? (
              <div className="text-center py-10">
                <p>Error loading indie bookshops with {featureName.toLowerCase()}. Please try again later.</p>
              </div>
            ) : bookshops.length === 0 ? (
              <div className="text-center py-10">
                <p>No indie bookshops found with {featureName.toLowerCase()}.</p>
                <p className="mt-2 mb-4">We're constantly updating our directory of bookshops specializing in {featureName.toLowerCase()}. Check back soon!</p>
                <Link href="/directory/categories">
                  <Button className="mt-4 bg-[#2A6B7C] hover:bg-[#2A6B7C]/90 text-white">
                    Browse All Bookshop Categories
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-600 mb-4">
                  Browse our list of {bookshops.length} independent bookshops offering {featureName.toLowerCase()}. These specialty bookshops provide unique experiences for readers interested in {featureName.toLowerCase()}. Click on any bookshop for more details.
                </p>
                {bookshops.map((bookshop) => (
                  <BookshopCard 
                    key={bookshop.id} 
                    bookstore={bookshop} 
                    showDetails={handleShowDetails} 
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bookshop Detail Modal */}
      {selectedBookshopId && (
        <BookshopDetail 
          bookshopId={selectedBookshopId} 
          isOpen={isDetailOpen} 
          onClose={handleCloseDetail} 
        />
      )}
      
      {/* SEO Content Section */}
      <section className="mt-12 bg-[#F7F3E8] rounded-lg p-6">
        <h2 className="text-2xl font-serif font-bold text-[#5F4B32] mb-4">
          About {featureName} Bookshops
        </h2>
        <div className="prose prose-p:text-gray-700 max-w-none">
          <p>
            Independent bookshops with {featureName.toLowerCase()} offer a specialized literary experience for book lovers across America. These unique bookstores create spaces where readers can discover curated selections, expert recommendations, and community events centered around {featureName.toLowerCase()}.
          </p>
          <p>
            What sets {featureName.toLowerCase()} bookshops apart is their dedication to providing depth and breadth in their specialty. From rare collections to the latest releases, indie bookshops specializing in {featureName.toLowerCase()} cultivate passionate communities of readers and create welcoming environments for exploration and discovery.
          </p>
          <p>
            When looking for the best {featureName.toLowerCase()} bookshops, our directory connects you with independent booksellers who share your literary interests. These local bookshops offer personalized service that online retailers simply can't match, creating spaces where the love of books and {featureName.toLowerCase()} come together.
          </p>
          <p>
            Start exploring our comprehensive list of bookshops with {featureName.toLowerCase()} today to find your next favorite indie bookstore!
          </p>
        </div>
      </section>
    </div>
  );
};

export default CategoryDirectory;