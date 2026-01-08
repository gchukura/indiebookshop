import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useEffect, useRef } from "react";
import { Bookstore as Bookshop, Feature } from "@shared/schema";
import { MapPin, Map, Sparkles } from "lucide-react";
import BookshopIcon from "@/components/BookshopIcon";
import { SEO } from "../components/SEO";
import { 
  BASE_URL, 
  PAGE_KEYWORDS
} from "../lib/seo";
import { generateSlugFromName } from "../lib/linkUtils";
import { Button } from "@/components/ui/button";

// Constants moved outside component to avoid recreation on every render
const STATE_MAP: {[key: string]: string} = {
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

const US_STATE_ABBREVIATIONS = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 
  'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 
  'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 
  'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 
  'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

// Helper function to get state flag/image URL
// Using a combination of state flags from a reliable CDN and fallbacks
const getStateImageUrl = (abbreviation: string): string => {
  // Special case: District of Columbia (DC) - DC flag is 3 red stars over 2 red bars on white
  if (abbreviation === 'DC') {
    // DC flag SVG as data URL (3 red stars over 2 red bars on white background)
    // Using proper star polygon shapes
    const starPath = 'M5,2 L5.5,4 L7.5,4 L6,5.5 L6.5,7.5 L5,6.5 L3.5,7.5 L4,5.5 L2.5,4 L4.5,4 Z';
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='30' viewBox='0 0 40 30'%3E%3Crect width='40' height='30' fill='white'/%3E%3Crect y='10' width='40' height='3' fill='%23DC143C'/%3E%3Crect y='17' width='40' height='3' fill='%23DC143C'/%3E%3Cpath d='M10,5 L10.5,7 L12.5,7 L11,8.5 L11.5,10.5 L10,9.5 L8.5,10.5 L9,8.5 L7.5,7 L9.5,7 Z' fill='%23DC143C'/%3E%3Cpath d='M20,5 L20.5,7 L22.5,7 L21,8.5 L21.5,10.5 L20,9.5 L18.5,10.5 L19,8.5 L17.5,7 L19.5,7 Z' fill='%23DC143C'/%3E%3Cpath d='M30,5 L30.5,7 L32.5,7 L31,8.5 L31.5,10.5 L30,9.5 L28.5,10.5 L29,8.5 L27.5,7 L29.5,7 Z' fill='%23DC143C'/%3E%3C/svg%3E`;
  }
  
  // Special case: Heard and McDonald Islands (HM) - uses Australia flag (territory of Australia)
  if (abbreviation === 'HM') {
    return 'https://flagcdn.com/w40/au.png';
  }
  
  // For US states, try multiple sources for state flags
  if (US_STATE_ABBREVIATIONS.includes(abbreviation)) {
    // Try flagcdn.com first (supports US state flags)
    const stateLower = abbreviation.toLowerCase();
    // Format: us-{state} for state flags
    return `https://flagcdn.com/w40/us-${stateLower}.png`;
  }
  
  // For Canadian provinces, use Canada flag
  const canadianProvinces = ['BC', 'ON', 'QC', 'AB', 'MB', 'NS', 'NB', 'SK'];
  if (canadianProvinces.includes(abbreviation)) {
    return 'https://flagcdn.com/w40/ca.png';
  }
  
  // For other regions, try to use country flags
  if (abbreviation === 'VI') {
    return 'https://flagcdn.com/w40/vi.png';
  }
  
  // Default placeholder - simple gray rectangle with border
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='30'%3E%3Crect width='40' height='30' fill='%23f3f4f6' stroke='%23d1d5db' stroke-width='1'/%3E%3C/svg%3E`;
};

// Helper functions moved outside component
const extractPhotoReference = (photo: any): string | null => {
  if (!photo) return null;
  if (typeof photo === 'string') return photo;
  if (typeof photo === 'object' && photo.photo_reference) {
    return photo.photo_reference;
  }
  return null;
};

const getHeroImageUrl = (bookshop: Bookshop): string => {
  // Priority 1: First Google photo if available
  if (bookshop.googlePhotos && Array.isArray(bookshop.googlePhotos) && bookshop.googlePhotos.length > 0) {
    const firstPhoto = bookshop.googlePhotos[0];
    const photoRef = extractPhotoReference(firstPhoto);
    if (photoRef) {
      return `/api/place-photo?photo_reference=${encodeURIComponent(photoRef)}&maxwidth=800`;
    }
  }
  
  // Priority 2: Existing imageUrl
  if (bookshop.imageUrl) {
    return bookshop.imageUrl;
  }
  
  // Priority 3: Fallback to Unsplash stock photo
  return 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600';
};

const Home = () => {
  const queryClient = useQueryClient();
  const featuredSectionRef = useRef<HTMLElement>(null);
  const browseByStateRef = useRef<HTMLElement>(null);
  
  // Prefetch data immediately on mount for better performance
  useEffect(() => {
    // Prefetch both endpoints in parallel - this starts fetching immediately
    const prefetchBookshops = queryClient.prefetchQuery<Bookshop[]>({
      queryKey: ["/api/bookstores"],
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
    const prefetchFeatures = queryClient.prefetchQuery<Feature[]>({
      queryKey: ["/api/features"],
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
    
    // Don't await - let them fetch in parallel
    Promise.all([prefetchBookshops, prefetchFeatures]).catch(() => {
      // Silently handle errors - the useQuery hooks will handle retries
    });
  }, [queryClient]);
  
  // Fetch all bookshops - will use prefetched data if available
  const { data: bookshops, isLoading } = useQuery<Bookshop[]>({
    queryKey: ["/api/bookstores"],
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  // Fetch features for the bookshop cards - will use prefetched data if available
  const { data: features } = useQuery<Feature[]>({
    queryKey: ["/api/features"],
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
  
  // Prefetch images for featured bookshops when section is about to be visible
  useEffect(() => {
    if (!featuredSectionRef.current || !bookshops || bookshops.length === 0) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Prefetch images for featured bookshops
            const featured = bookshops.slice(0, 6);
            featured.forEach((bookshop) => {
              const imageUrl = getHeroImageUrl(bookshop);
              if (imageUrl && !imageUrl.startsWith('data:')) {
                const link = document.createElement('link');
                link.rel = 'prefetch';
                link.as = 'image';
                link.href = imageUrl;
                document.head.appendChild(link);
              }
            });
            observer.disconnect();
          }
        });
      },
      { rootMargin: '200px' } // Start prefetching 200px before section is visible
    );
    
    observer.observe(featuredSectionRef.current);
    
    return () => observer.disconnect();
  }, [bookshops]);
  
  // SEO metadata for the homepage
  const seoTitle = useMemo(() => {
    return "IndiebookShop.com | Find Independent Bookshops Across America";
  }, []);
  
  const seoDescription = useMemo(() => {
    return "Explore over 3,000 independent bookshops across all 50 states. Search by location, browse by specialty, or discover shops near you on our interactive map.";
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
  
  // Memoized featured bookshops - curated selection algorithm
  // Selects diverse, high-quality bookshops for better user experience
  const featuredBookshops = useMemo((): Bookshop[] => {
    if (!bookshops || bookshops.length === 0) return [];
    
    // Strategy: Create a curated mix of:
    // 1. Highly-rated bookshops (4.5+ stars with 50+ reviews)
    // 2. Bookshops with images (better visual appeal)
    // 3. Geographic diversity (different states)
    // 4. Bookshops with descriptions (more informative)
    
    // Separate into quality tiers
    const highQuality: Bookshop[] = []; // Has image + (high rating OR description)
    const goodQuality: Bookshop[] = []; // Has image OR (high rating + description)
    const standard: Bookshop[] = []; // Everything else
    
    const seenSlugs = new Set<string>();
    const seenStates = new Set<string>();
    
    for (const shop of bookshops) {
      // Skip duplicates (same slug)
      const slug = generateSlugFromName(shop.name);
      if (seenSlugs.has(slug)) continue;
      seenSlugs.add(slug);
      
      const hasImage = !!shop.imageUrl;
      const hasDescription = !!(shop.description && shop.description.trim().length > 50);
      const rating = parseFloat(shop.googleRating || '0');
      const reviewCount = shop.googleReviewCount || 0;
      const isHighlyRated = rating >= 4.5 && reviewCount >= 50;
      
      // Categorize by quality
      if (hasImage && (isHighlyRated || hasDescription)) {
        highQuality.push(shop);
      } else if (hasImage || (isHighlyRated && hasDescription)) {
        goodQuality.push(shop);
      } else {
        standard.push(shop);
      }
    }
    
    // Sort each tier by quality metrics
    const sortByQuality = (a: Bookshop, b: Bookshop) => {
      const aRating = parseFloat(a.googleRating || '0');
      const bRating = parseFloat(b.googleRating || '0');
      const aReviews = a.googleReviewCount || 0;
      const bReviews = b.googleReviewCount || 0;
      
      // Prioritize by rating, then review count
      if (bRating !== aRating) return bRating - aRating;
      return bReviews - aReviews;
    };
    
    highQuality.sort(sortByQuality);
    goodQuality.sort(sortByQuality);
    standard.sort(sortByQuality);
    
    // Build curated selection with geographic diversity
    const selected: Bookshop[] = [];
    const selectedStates = new Set<string>();
    
    // First pass: Select high-quality bookshops with geographic diversity
    for (const shop of highQuality) {
      if (selected.length >= 20) break;
      const state = shop.state || '';
      // Prefer shops from states we haven't shown yet
      if (!selectedStates.has(state) || selected.length < 12) {
        selected.push(shop);
        if (state) selectedStates.add(state);
      }
    }
    
    // Second pass: Fill remaining slots with good quality
    for (const shop of goodQuality) {
      if (selected.length >= 20) break;
      if (!selected.find(s => generateSlugFromName(s.name) === generateSlugFromName(shop.name))) {
        selected.push(shop);
      }
    }
    
    // Third pass: Fill any remaining slots with standard quality
    for (const shop of standard) {
      if (selected.length >= 20) break;
      if (!selected.find(s => generateSlugFromName(s.name) === generateSlugFromName(shop.name))) {
        selected.push(shop);
      }
    }
    
    return selected.slice(0, 20);
  }, [bookshops]);
  
  // Pre-compute features map for O(1) lookup instead of O(n) filter
  const featuresMap = useMemo(() => {
    if (!features) return {} as Record<number, Feature>;
    const map: Record<number, Feature> = {};
    features.forEach(f => {
      map[f.id] = f;
    });
    return map;
  }, [features]);
  
  // Smooth scroll handler
  const scrollToElement = useCallback((elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);
  
  // Compute bookshop counts per state
  const stateCounts = useMemo(() => {
    if (!bookshops || bookshops.length === 0) return {} as Record<string, number>;
    const counts: Record<string, number> = {};
    bookshops.forEach((bookshop: Bookshop) => {
      if (bookshop.state) {
        counts[bookshop.state] = (counts[bookshop.state] || 0) + 1;
      }
    });
    return counts;
  }, [bookshops]);

  // Memoize browse by state computations
  const stateData = useMemo(() => {
    if (!bookshops || bookshops.length === 0) {
      return { usStates: [], otherRegions: [] };
    }
    
    // Get unique states from bookshops
    const stateAbbreviations = Array.from(new Set(bookshops.map((b: Bookshop) => b.state)))
      .filter(state => state) as string[];
    
    // Separate US states from other regions
    const usStates = stateAbbreviations
      .filter((abbr: string) => US_STATE_ABBREVIATIONS.includes(abbr))
      .map((abbr: string) => ({
        abbreviation: abbr,
        fullName: STATE_MAP[abbr] || abbr,
        count: stateCounts[abbr] || 0
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
    
    const otherRegions = stateAbbreviations
      .filter((abbr: string) => !US_STATE_ABBREVIATIONS.includes(abbr))
      .map((abbr: string) => ({
        abbreviation: abbr,
        fullName: STATE_MAP[abbr] || abbr,
        count: stateCounts[abbr] || 0
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
    
    return { usStates, otherRegions };
  }, [bookshops, stateCounts]);

  return (
    <div>
      {/* SEO Component */}
      <SEO 
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        canonicalUrl={canonicalUrl}
        ogImage={`${BASE_URL}/og-image.jpg`}
        ogImageAlt="IndiebookShop - Discover Independent Bookshops Across America"
        ogImageWidth={1200}
        ogImageHeight={630}
      />
      
      {/* Hero Section - Updated */}
      <section className="bg-[#5F4B32] py-10 md:py-16 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="font-serif text-3xl md:text-4xl lg:text-display font-bold text-white mb-4 md:mb-6">
              Discover Independent Bookshops Across America
            </h1>
            <p className="font-sans text-base md:text-body-lg text-gray-100 mb-8 md:mb-10 max-w-4xl mx-auto px-4 md:px-2">
              Explore over 3,000 independent bookshops in all 50 U.S. states and Canada. Search by location, browse by specialty, or discover shops near you on our interactive map.
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
                <h3 className="font-serif font-bold text-xl text-[#5F4B32] mb-3 flex items-center gap-2 justify-start">
                  <MapPin className="w-6 h-6 text-[#2A6B7C] flex-shrink-0" />
                  <span>Search by Location</span>
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
                <h3 className="font-serif font-bold text-xl text-[#5F4B32] mb-3 flex items-center gap-2 justify-start">
                  <Map className="w-6 h-6 text-[#2A6B7C] flex-shrink-0" />
                  <span>Browse by State</span>
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
                <h3 className="font-serif font-bold text-xl text-[#5F4B32] mb-3 flex items-start gap-2">
                  <Sparkles className="w-6 h-6 text-[#2A6B7C] flex-shrink-0 mt-0.5" />
                  <span className="leading-tight">Discover Featured Shops</span>
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
              <div className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-[#E16D3D] mb-2">3,000+</div>
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
      <section id="featured-bookshops" ref={featuredSectionRef} className="py-8 md:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg p-6 md:p-8">
            <div className="relative border-4 border-[#2A6B7C] rounded-lg p-4 md:p-6 pt-8 md:pt-6 shadow-sm bg-[#2A6B7C]/5">
              <div className="absolute -top-4 md:-top-5 left-0 w-full flex items-center justify-center px-2">
                <div className="flex-1 h-0.5 bg-[#2A6B7C]"></div>
                <h2 className="inline-block bg-white px-2 md:px-5 text-lg md:text-2xl lg:text-3xl font-serif font-bold text-[#5F4B32] text-center mx-2">
                  Featured Bookshops
                </h2>
                <div className="flex-1 h-0.5 bg-[#2A6B7C]"></div>
              </div>
              <p className="text-center text-sm md:text-base lg:text-lg text-gray-700 mb-4 md:mb-6 lg:mb-8 mt-2 md:mt-0 px-2">
                Discover standout indie bookshops from across our directory. Each offers unique character and community connection.
              </p>
            
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                      <div className="w-full h-36 sm:h-40 md:h-48 bg-gray-200" />
                      <div className="p-4 md:p-5">
                        <div className="h-6 bg-gray-200 rounded mb-2" />
                        <div className="h-4 bg-gray-200 rounded mb-3 w-2/3" />
                        <div className="h-4 bg-gray-200 rounded mb-2" />
                        <div className="h-4 bg-gray-200 rounded mb-2 w-5/6" />
                        <div className="flex gap-2 mt-3">
                          <div className="h-6 w-20 bg-gray-200 rounded-full" />
                          <div className="h-6 w-24 bg-gray-200 rounded-full" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
                  {featuredBookshops.map((bookshop) => {
                    // Get feature names for this bookshop using pre-computed map (O(1) lookup)
                    const bookshopFeatures = bookshop.featureIds
                      ? bookshop.featureIds
                          .slice(0, 3)
                          .map(id => featuresMap[id])
                          .filter((f): f is Feature => f !== undefined)
                      : [];
                    
                    const bookshopSlug = generateSlugFromName(bookshop.name);
                    const heroImageUrl = getHeroImageUrl(bookshop);
                    
                    return (
                      <div key={bookshop.id} className="bg-white rounded-lg shadow-md overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg">
                        <Link to={`/bookshop/${bookshopSlug}`}>
                          <img 
                            src={heroImageUrl} 
                            alt={bookshop.name}
                            className="w-full h-36 sm:h-40 md:h-48 object-cover cursor-pointer" 
                            loading="lazy"
                            fetchPriority="high"
                            onError={(e) => {
                              // Fallback to Unsplash stock photo if image fails to load
                              e.currentTarget.src = 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600';
                            }}
                          />
                        </Link>
                        <div className="p-4 md:p-5">
                          <Link to={`/bookshop/${bookshopSlug}`}>
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
      
      {/* Popular Bookshops Section - NEW */}
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg p-6 md:p-8">
            <div className="relative border-4 border-[#2A6B7C] rounded-lg p-4 md:p-6 pt-8 md:pt-6 shadow-sm bg-[#2A6B7C]/5">
              <div className="absolute -top-4 md:-top-5 left-0 w-full flex items-center justify-center px-2">
                <div className="flex-1 h-0.5 bg-[#2A6B7C]"></div>
                <h2 className="inline-block bg-white px-2 md:px-5 text-lg md:text-2xl lg:text-3xl font-serif font-bold text-[#5F4B32] text-center mx-2">
                  Popular Bookshops
                </h2>
                <div className="flex-1 h-0.5 bg-[#2A6B7C]"></div>
              </div>
              <p className="text-center text-sm md:text-base lg:text-lg text-gray-700 mb-4 md:mb-6 lg:mb-8 mt-2 md:mt-0 px-2">
                Highly-rated independent bookshops loved by readers across America.
              </p>
            
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                      <div className="w-full h-36 sm:h-40 md:h-48 bg-gray-200" />
                      <div className="p-4 md:p-5">
                        <div className="h-6 bg-gray-200 rounded mb-2" />
                        <div className="h-4 bg-gray-200 rounded mb-3 w-2/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
                  {(() => {
                    // Get popular bookshops (sorted by review count, then rating)
                    // Deduplicate to avoid showing the same bookshop multiple times
                    // Strategy: Same city/state + same review count + same rating = likely duplicate
                    // Also deduplicate by generated slug as a fallback
                    const seenKeys = new Set<string>();
                    const popularBookshops = [...(bookshops || [])]
                      .filter(shop => shop.googleReviewCount && shop.googleReviewCount > 0)
                      .sort((a, b) => {
                        const aCount = a.googleReviewCount || 0;
                        const bCount = b.googleReviewCount || 0;
                        if (bCount !== aCount) return bCount - aCount;
                        const aRating = parseFloat(a.googleRating || '0');
                        const bRating = parseFloat(b.googleRating || '0');
                        return bRating - aRating;
                      })
                      .filter(shop => {
                        // Create a unique key: city-state-reviewCount-rating
                        // This catches duplicates like "Powell's Books" and "Powell's City of Books"
                        const locationKey = `${shop.city || ''}-${shop.state || ''}-${shop.googleReviewCount || 0}-${shop.googleRating || '0'}`;
                        const slug = generateSlugFromName(shop.name);
                        
                        // Check both location-based key and slug
                        if (seenKeys.has(locationKey) || seenKeys.has(slug)) {
                          return false; // Skip duplicate
                        }
                        seenKeys.add(locationKey);
                        seenKeys.add(slug);
                        return true;
                      })
                      .slice(0, 15); // Show top 15 popular bookshops
                    
                    return popularBookshops.map((bookshop) => {
                      const bookshopFeatures = bookshop.featureIds
                        ? bookshop.featureIds
                            .slice(0, 2)
                            .map(id => featuresMap[id])
                            .filter((f): f is Feature => f !== undefined)
                        : [];
                      
                      const bookshopSlug = generateSlugFromName(bookshop.name);
                      const heroImageUrl = getHeroImageUrl(bookshop);
                      
                      return (
                        <div key={bookshop.id} className="bg-white rounded-lg shadow-md overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg">
                          <Link to={`/bookshop/${bookshopSlug}`}>
                            <img 
                              src={heroImageUrl} 
                              alt={bookshop.name}
                              className="w-full h-36 sm:h-40 md:h-48 object-cover cursor-pointer" 
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.src = 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600';
                              }}
                            />
                          </Link>
                          <div className="p-4 md:p-5">
                            <Link to={`/bookshop/${bookshopSlug}`}>
                              <h3 className="font-serif font-bold text-base md:text-lg lg:text-xl text-[#5F4B32] mb-2 cursor-pointer hover:text-[#E16D3D] leading-tight line-clamp-2">{bookshop.name}</h3>
                            </Link>
                            <p className="text-xs md:text-sm text-gray-600 mb-2">{bookshop.city || ''}{bookshop.city && bookshop.state ? ', ' : ''}{bookshop.state || ''}</p>
                            {bookshop.googleRating && bookshop.googleReviewCount && (
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-yellow-500 font-semibold">{bookshop.googleRating}</span>
                                <span className="text-xs text-gray-600">({bookshop.googleReviewCount.toLocaleString()} reviews)</span>
                              </div>
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
                    });
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      
      {/* Browse by State Section */}
      <section id="browse-by-state" ref={browseByStateRef} className="py-8 md:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg p-6 md:p-8">
            <div className="relative border-4 border-[#2A6B7C] rounded-lg p-4 md:p-6 pt-8 md:pt-6 shadow-sm bg-[#2A6B7C]/5">
              <div className="absolute -top-4 md:-top-5 left-0 w-full flex items-center justify-center px-2">
                <div className="flex-1 h-0.5 bg-[#2A6B7C]"></div>
                <h2 className="inline-block bg-white px-2 md:px-5 text-lg md:text-2xl lg:text-3xl font-serif font-bold text-[#5F4B32] text-center mx-2">
                  Browse by State
                </h2>
                <div className="flex-1 h-0.5 bg-[#2A6B7C]"></div>
              </div>
              <p className="text-center text-sm md:text-base lg:text-lg text-gray-700 mb-4 md:mb-6 lg:mb-8 mt-2 md:mt-0 px-2">
                Explore independent bookshops across all 50 states and find your next literary destination.
              </p>
            
            <div className="mt-2 md:mt-0">
              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                    <div key={i} className="flex items-center gap-2 animate-pulse">
                      <div className="w-6 h-4 bg-gray-200 rounded-sm flex-shrink-0" />
                      <div className="h-5 bg-gray-200 rounded flex-1" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col space-y-6">
                  {/* United States section */}
                  <div>
                    <h3 className="text-lg md:text-xl font-serif font-bold text-[#5F4B32] mb-3 md:mb-4">
                      United States
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
                      {stateData.usStates.map(state => (
                        <Link 
                          key={state.abbreviation} 
                          href={`/directory?state=${state.abbreviation}`}
                          className="flex items-center gap-2 font-serif font-bold text-[#2A6B7C] hover:text-[#E16D3D] transition-colors"
                        >
                          <img 
                            src={getStateImageUrl(state.abbreviation)}
                            alt={`${state.fullName} flag`}
                            className="w-6 h-4 object-cover rounded-sm flex-shrink-0"
                            loading="lazy"
                            onError={(e) => {
                              // Fallback to a simple placeholder if image fails to load
                              e.currentTarget.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='16'%3E%3Crect width='24' height='16' fill='%23e5e7eb'/%3E%3C/svg%3E`;
                            }}
                          />
                          <span className="flex-1">
                            {state.fullName}
                            {state.count > 0 && (
                              <span className="text-sm font-normal text-stone-600 ml-2">
                                ({state.count})
                              </span>
                            )}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                  
                  {/* Only show Other Regions section if there are any */}
                  {stateData.otherRegions.length > 0 && (
                    <div>
                      <h3 className="text-lg md:text-xl font-serif font-bold text-[#5F4B32] mb-3 md:mb-4">
                        Other Regions
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
                        {stateData.otherRegions.map(region => (
                          <Link 
                            key={region.abbreviation} 
                            href={`/directory?state=${region.abbreviation}`}
                            className="flex items-center gap-2 font-serif font-bold text-[#2A6B7C] hover:text-[#E16D3D] transition-colors"
                          >
                            <img 
                              src={getStateImageUrl(region.abbreviation)}
                              alt={`${region.fullName} flag`}
                              className="w-6 h-4 object-cover rounded-sm flex-shrink-0"
                              loading="lazy"
                              onError={(e) => {
                                // Fallback to a simple placeholder if image fails to load
                                e.currentTarget.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='16'%3E%3Crect width='24' height='16' fill='%23e5e7eb'/%3E%3C/svg%3E`;
                              }}
                            />
                            <span className="flex-1">
                              {region.fullName}
                              {region.count > 0 && (
                                <span className="text-sm font-normal text-stone-600 ml-2">
                                  ({region.count})
                                </span>
                              )}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Why Independent Bookshops Section */}
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg p-6 md:p-8">
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
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#F7F3E8] rounded-lg p-6 md:p-8">
            <div className="relative border-4 border-[#2A6B7C] rounded-lg p-4 md:p-6 lg:p-8 pt-8 md:pt-10">
              <div className="absolute -top-4 md:-top-5 left-0 w-full flex justify-center px-2">
                <h2 className="inline-block bg-[#F7F3E8] px-2 md:px-5 text-2xl md:text-3xl font-serif font-bold text-[#5F4B32] text-center">
                  America's Most Comprehensive Independent Bookshop Directory
                </h2>
              </div>
              <div className="prose prose-lg prose-p:text-gray-700 max-w-none mx-auto mt-4 md:mt-6">
                <p>
                  IndiebookShop.com features over 3,000 independent bookshops across all 50 states - the most comprehensive 
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