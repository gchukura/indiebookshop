import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { logger } from "@/lib/logger";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Feature } from "@shared/schema";
import { stateMap, normalizeStateToAbbreviation } from "@/lib/stateUtils";

interface FilterControlsProps {
  bookshopCount: number;
  onStateChange: (state: string) => void;
  onCityChange: (city: string) => void;
  onCountyChange: (county: string) => void;
  onFeatureChange: (featureId: number | null) => void;
  selectedState: string;
  selectedCity: string;
  selectedCounty: string;
  selectedFeature: number | null;
}

const FilterControls = ({ 
  bookshopCount, 
  onStateChange,
  onCityChange,
  onCountyChange,
  onFeatureChange,
  selectedState, 
  selectedCity,
  selectedCounty,
  selectedFeature 
}: FilterControlsProps) => {
  // Fetch all states with bookstores
  const { data: statesData = [], isError: statesError } = useQuery<string[]>({
    queryKey: ["/api/states"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/states");
        if (!response.ok) {
          logger.error('Failed to fetch states', undefined, { status: response.status });
          return [];
        }
        return response.json();
      } catch (error) {
        logger.error('Error fetching states', error);
        return [];
      }
    },
    staleTime: Infinity,
    retry: 1,
  });

  // Fetch cities - filter by state if selected
  const { data: citiesData = [] } = useQuery<string[]>({
    queryKey: selectedState ? ["/api/states", selectedState, "cities"] : ["/api/cities"],
    queryFn: async () => {
      const endpoint = selectedState 
        ? `/api/states/${selectedState}/cities`
        : "/api/cities";
      try {
        const response = await fetch(endpoint);
        if (!response.ok) {
          logger.error('Failed to fetch cities', undefined, { status: response.status, endpoint });
          return [];
        }
        return response.json();
      } catch (error) {
        logger.error('Error fetching cities', error, { endpoint });
        return [];
      }
    },
    enabled: true,
    staleTime: Infinity,
    retry: 1,
  });

  // Fetch counties - filter by state if selected
  const { data: countiesData = [] } = useQuery<string[]>({
    queryKey: selectedState ? ["/api/states", selectedState, "counties"] : ["/api/counties"],
    queryFn: async () => {
      const endpoint = selectedState
        ? `/api/states/${selectedState}/counties`
        : "/api/counties";
      try {
        const response = await fetch(endpoint);
        if (!response.ok) {
          logger.error('Failed to fetch counties', undefined, { status: response.status, endpoint });
          return [];
        }
        return response.json();
      } catch (error) {
        logger.error('Error fetching counties', error, { endpoint });
        return [];
      }
    },
    enabled: true,
    staleTime: Infinity,
    retry: 1,
  });

  // Fetch features for dropdown
  const { data: featuresData } = useQuery<Feature[]>({
    queryKey: ["/api/features"],
  });

  // Use query data directly instead of local state to avoid synchronization issues
  const states = statesData || [];
  const cities = citiesData || [];
  const counties = countiesData || [];

  const handleStateChange = (value: string) => {
    if (value === "all") {
      onStateChange("");
      return;
    }
    // Normalize state to uppercase abbreviation (handles both "Michigan" and "MI")
    // This ensures consistent format regardless of how the state is selected
    const normalizedState = normalizeStateToAbbreviation(value) || value.toUpperCase();
    onStateChange(normalizedState);
    // Note: We don't clear city/county when state changes to allow users to
    // keep their selections and see if they match the new state
  };

  const handleCityChange = (value: string) => {
    onCityChange(value === "all" ? "" : value);
  };

  const handleCountyChange = (value: string) => {
    onCountyChange(value === "all" ? "" : value);
  };

  const handleFeatureChange = (value: string) => {
    if (value === "all") {
      onFeatureChange(null);
      return;
    }
    
    const featureId = parseInt(value);
    onFeatureChange(featureId || null);
  };

  return (
    <div className="bg-white shadow-sm py-3 md:py-4 rounded-md">
      {/* Changed from md:grid-cols-5 to md:grid-cols-4 since category filter is commented out */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="flex flex-col">
          <label htmlFor="state-select" className="mb-1.5 md:mb-1 text-sm font-medium text-gray-700">Filter by State</label>
          <Select value={selectedState || "all"} onValueChange={handleStateChange}>
            <SelectTrigger 
              id="state-select"
              aria-label="Select state to filter bookshops"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 md:py-2 text-sm focus:outline-none focus:border-[#2A6B7C] focus:ring-[#2A6B7C] focus:ring-2 focus:ring-offset-0 min-h-[44px] md:min-h-0"
            >
              <SelectValue placeholder="All States" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              {states && states.length > 0 ? (
                states
                  .filter(state => state && state.trim() !== "" && state !== "#ERROR!")
                  .sort((a, b) => {
                    // Sort by full state name for better UX
                    const nameA = stateMap[a] || a;
                    const nameB = stateMap[b] || b;
                    return nameA.localeCompare(nameB);
                  })
                  .map((state) => {
                    // Display full name but store abbreviation
                    const fullName = stateMap[state] || state;
                    return (
                      <SelectItem key={state} value={state}>
                        {fullName}
                      </SelectItem>
                    );
                  })
              ) : null}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex flex-col">
          <label htmlFor="city-select" className="mb-1.5 md:mb-1 text-sm font-medium text-gray-700">Filter by City</label>
          <Select value={selectedCity || "all"} onValueChange={handleCityChange}>
            <SelectTrigger 
              id="city-select"
              aria-label="Select city to filter bookshops"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 md:py-2 text-sm focus:outline-none focus:border-[#2A6B7C] focus:ring-[#2A6B7C] focus:ring-2 focus:ring-offset-0 min-h-[44px] md:min-h-0"
            >
              <SelectValue placeholder="All Cities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {cities && cities.length > 0 ? (
                cities
                  .filter(city => city && city.trim() !== "")
                  .sort()
                  .map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))
              ) : null}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex flex-col">
          <label htmlFor="county-select" className="mb-1.5 md:mb-1 text-sm font-medium text-gray-700">Filter by County</label>
          <Select value={selectedCounty || "all"} onValueChange={handleCountyChange}>
            <SelectTrigger 
              id="county-select"
              aria-label="Select county to filter bookshops"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 md:py-2 text-sm focus:outline-none focus:border-[#2A6B7C] focus:ring-[#2A6B7C] focus:ring-2 focus:ring-offset-0 min-h-[44px] md:min-h-0"
            >
              <SelectValue placeholder="All Counties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Counties</SelectItem>
              {counties && counties.length > 0 ? (
                counties
                  .filter(county => county && county.trim() !== "")
                  .sort()
                  .map((county) => (
                    <SelectItem key={county} value={county}>
                      {county}
                    </SelectItem>
                  ))
              ) : null}
            </SelectContent>
          </Select>
        </div>
        
        {/* Category filter temporarily disabled until featureIds column is added to Google Sheet */}
        {/* <div className="flex flex-col">
          <label htmlFor="feature" className="mb-1 font-medium text-sm">Filter by Category</label>
          <Select value={selectedFeature ? selectedFeature.toString() : "all"} onValueChange={handleFeatureChange}>
            <SelectTrigger className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#2A6B7C]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {featuresData && featuresData.length > 0 ? (
                featuresData.map((feature) => (
                  <SelectItem key={feature.id} value={feature.id.toString()}>
                    {feature.name}
                  </SelectItem>
                ))
              ) : null}
            </SelectContent>
          </Select>
        </div> */}
        
        <div className="flex items-center sm:items-end justify-start sm:justify-end pt-1 sm:pt-0">
          <div className="text-sm md:text-base font-medium text-gray-700">{bookshopCount} bookshops found</div>
        </div>
      </div>
    </div>
  );
};

export default FilterControls;
