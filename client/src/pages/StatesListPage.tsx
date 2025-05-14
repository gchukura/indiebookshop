import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Feature } from "@shared/schema";

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

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-[#5F4B32] mb-4">
          Browse Bookstores by State
        </h1>
        <p className="text-gray-600 mb-6">
          Find independent bookstores across the United States and Canada. Select a state to see all the bookstores in that area.
        </p>
      </div>

      {statesLoading ? (
        <div className="text-center py-10">
          <p>Loading states...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.keys(groupedStates).map(region => {
            if (groupedStates[region].length === 0) return null;
            
            return (
              <div key={region} className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-serif font-bold text-[#5F4B32] mb-4">
                  {region}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {groupedStates[region].sort().map(state => (
                    <Link 
                      key={state} 
                      href={`/directory/state/${state}`}
                    >
                      <Button 
                        variant="outline" 
                        className="w-full justify-center text-center font-medium hover:bg-[#2A6B7C]/5 hover:text-[#2A6B7C] hover:border-[#2A6B7C] transition-colors"
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
    </div>
  );
};

export default StatesListPage;