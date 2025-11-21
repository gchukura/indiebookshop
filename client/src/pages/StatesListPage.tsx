import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Feature } from "@shared/schema";
import { SEO } from "../components/SEO";
import { BASE_URL, PAGE_KEYWORDS, DESCRIPTION_TEMPLATES, generateSlug } from "../lib/seo";

const StatesListPage = () => {
  // Fetch all states
  const { data: states = [], isLoading: statesLoading } = useQuery<string[]>({
    queryKey: ["/api/states"],
  });
  
  // State abbreviation to full name mapping
  const stateMap: {[key: string]: string} = {
    'AL': 'Alabama', 
    'AK': 'Alaska', 
    'AZ': 'Arizona', 
    'AR': 'Arkansas', 
    'CA': 'California', 
    'CO': 'Colorado', 
    'CT': 'Connecticut', 
    'DE': 'Delaware', 
    'DC': 'District of Columbia', 
    'FL': 'Florida', 
    'GA': 'Georgia', 
    'HI': 'Hawaii', 
    'ID': 'Idaho', 
    'IL': 'Illinois', 
    'IN': 'Indiana', 
    'IA': 'Iowa', 
    'KS': 'Kansas', 
    'KY': 'Kentucky', 
    'LA': 'Louisiana', 
    'ME': 'Maine', 
    'MD': 'Maryland', 
    'MA': 'Massachusetts', 
    'MI': 'Michigan', 
    'MN': 'Minnesota', 
    'MS': 'Mississippi', 
    'MO': 'Missouri', 
    'MT': 'Montana', 
    'NE': 'Nebraska', 
    'NV': 'Nevada', 
    'NH': 'New Hampshire', 
    'NJ': 'New Jersey', 
    'NM': 'New Mexico', 
    'NY': 'New York', 
    'NC': 'North Carolina', 
    'ND': 'North Dakota', 
    'OH': 'Ohio', 
    'OK': 'Oklahoma', 
    'OR': 'Oregon', 
    'PA': 'Pennsylvania', 
    'RI': 'Rhode Island', 
    'SC': 'South Carolina', 
    'SD': 'South Dakota', 
    'TN': 'Tennessee', 
    'TX': 'Texas', 
    'UT': 'Utah', 
    'VT': 'Vermont', 
    'VA': 'Virginia', 
    'WA': 'Washington', 
    'WV': 'West Virginia', 
    'WI': 'Wisconsin', 
    'WY': 'Wyoming',
    
    // Canadian provinces
    'BC': 'British Columbia', 
    'ON': 'Ontario', 
    'QC': 'Quebec',
    'AB': 'Alberta', 
    'MB': 'Manitoba', 
    'NS': 'Nova Scotia',
    'NB': 'New Brunswick', 
    'SK': 'Saskatchewan',
    
    // Other territories and regions
    'HM': 'Heard and McDonald Islands',
    'VI': 'Virgin Islands',
    'PR': 'Puerto Rico',
    'GU': 'Guam',
    'AS': 'American Samoa',
    'MP': 'Northern Mariana Islands'
  };
  
  // Get full state name from abbreviation
  const getFullStateName = (abbreviation: string): string => {
    return stateMap[abbreviation] || abbreviation;
  };

  // Group states in sections by region for better navigation
  const groupStates = () => {
    const regions: Record<string, string[]> = {
      "Northeast": ["CT", "DE", "DC", "ME", "MA", "NH", "NJ", "NY", "PA", "RI", "VT"],
      "Midwest": ["IL", "IN", "IA", "KS", "MI", "MN", "MO", "NE", "ND", "OH", "SD", "WI"],
      "South": ["AL", "AR", "FL", "GA", "KY", "LA", "MD", "MS", "NC", "OK", "SC", "TN", "TX", "VA", "WV"],
      "West": ["AK", "AZ", "CA", "CO", "HI", "ID", "MT", "NV", "NM", "OR", "UT", "WA", "WY"],
      "Canada": ["AB", "BC", "MB", "NB", "NL", "NS", "ON", "PE", "QC", "SK", "YT", "NT", "NU"],
      "Other Territories": ["VI", "PR", "GU", "AS", "MP", "HM"],
      "Other": [] // Keep this for states that don't fit into any predefined region
    };
    
    // Create a map for quick lookups
    const regionMap: Record<string, string> = {};
    Object.keys(regions).forEach(region => {
      regions[region].forEach((state: string) => {
        regionMap[state] = region;
      });
    });
    
    // Group states by region
    const grouped: Record<string, string[]> = {};
    Object.keys(regions).forEach(region => {
      grouped[region] = [];
    });
    
    states.forEach(state => {
      const region = regionMap[state] || "Other";
      grouped[region].push(state);
    });
    
    return grouped;
  };
  
  const groupedStates = groupStates();

  // SEO variables
  const pageTitle = "Search for Bookshops by State";
  const pageDescription = "Browse independent bookstores and indie bookshops by state across the United States and Canada. Find local bookshops in your state with our comprehensive bookstore directory.";
  const canonicalUrl = `${BASE_URL}/directory/states`;
  const keywords = [
    PAGE_KEYWORDS.states.mainKeyword,
    ...PAGE_KEYWORDS.states.additionalKeywords,
    'US bookstores',
    'Canada bookshops',
    'find independent bookstores by region'
  ];

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* SEO Component */}
      <SEO 
        title={pageTitle}
        description={pageDescription}
        keywords={keywords}
        canonicalUrl={canonicalUrl}
      />
      
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-[#5F4B32] mb-4">
          {pageTitle}
        </h1>
        <p className="text-gray-600 mb-6">
          Find independent bookshops across the United States and Canada. Select a state to see all the bookshops in that area.
        </p>
        <p className="text-gray-600 mb-6">
          Our directory includes {states.length} states and provinces with independent bookstores and indie bookshops. Discover local booksellers in your state today.
        </p>
      </div>

      {statesLoading ? (
        <div className="text-center py-10">
          <p className="text-base">Loading states...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.keys(groupedStates).map(region => {
            if (groupedStates[region].length === 0) return null;
            
            return (
              <div key={region} className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-serif font-bold text-[#5F4B32] mb-4">
                  {region} Bookshops
                </h2>
                <p className="text-gray-600 text-sm mb-4">
                  Find independent bookshops in the {region} region. Browse our bookstore directory by state.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {groupedStates[region].sort().map(state => (
                    <Link 
                      key={state} 
                      href={`/directory/state/${state}`}
                      title={`Independent bookstores in ${stateMap[state] || state}`}
                    >
                      <Button 
                        variant="outline" 
                        className="w-full justify-center text-center font-medium hover:bg-[#2A6B7C]/5 hover:text-[#2A6B7C] hover:border-[#2A6B7C] transition-colors"
                        aria-label={`Browse indie bookshops in ${stateMap[state] || state}`}
                      >
                        {stateMap[state] || state}
                      </Button>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SEO-friendly content section */}
      <section className="py-8 md:py-12 lg:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#F7F3E8] rounded-lg p-6 md:p-8 lg:p-10">
        <h2 className="text-2xl font-serif font-bold text-[#5F4B32] mb-4">
          Why Browse Bookshops by State?
        </h2>
        <div className="prose prose-p:text-gray-700 max-w-none">
          <p>
            Independent bookstores are the heart of literary communities across America. Each state offers a unique collection of indie bookshops with their own character, specialties, and local flavor. By browsing bookstores by state, you can discover hidden gems in your area or plan literary destinations for your next trip.
          </p>
          <p>
            Our comprehensive bookstore directory makes it easy to find independent bookshops in any state. Whether you're looking for rare book stores in New England, cozy reading spots in the Pacific Northwest, or vibrant literary hubs in the South, our state-by-state guide connects you with local booksellers nationwide.
          </p>
          <p>
            Independent bookstores do more than sell books—they host author events, support local writers, create community spaces, and preserve the unique literary culture of their regions. Start exploring our state directory today to find your next favorite indie bookshop!
          </p>
        </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default StatesListPage;