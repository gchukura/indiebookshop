import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Feature } from "@shared/schema";
import { stateMap } from "@/lib/stateUtils";

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
  const [states, setStates] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [counties, setCounties] = useState<string[]>([]);

  // Fetch all states with bookstores
  const { data: statesData } = useQuery<string[]>({
    queryKey: ["/api/states"],
    queryFn: async () => {
      const response = await fetch("/api/states");
      if (!response.ok) return [];
      return response.json();
    },
  });

  // Fetch cities - filter by state if selected
  const { data: citiesData } = useQuery<string[]>({
    queryKey: selectedState ? ["/api/states", selectedState, "cities"] : ["/api/cities"],
    queryFn: async () => {
      if (selectedState) {
        const response = await fetch(`/api/states/${selectedState}/cities`);
        if (!response.ok) return [];
        return response.json();
      } else {
        const response = await fetch("/api/cities");
        if (!response.ok) return [];
        return response.json();
      }
    },
    enabled: true,
  });

  // Fetch counties - filter by state if selected
  const { data: countiesData } = useQuery<string[]>({
    queryKey: selectedState ? ["/api/states", selectedState, "counties"] : ["/api/counties"],
    queryFn: async () => {
      if (selectedState) {
        const response = await fetch(`/api/states/${selectedState}/counties`);
        if (!response.ok) return [];
        return response.json();
      } else {
        const response = await fetch("/api/counties");
        if (!response.ok) return [];
        return response.json();
      }
    },
    enabled: true,
  });

  // Fetch features for dropdown
  const { data: featuresData } = useQuery<Feature[]>({
    queryKey: ["/api/features"],
  });

  useEffect(() => {
    if (statesData) {
      setStates(statesData);
    }
  }, [statesData]);

  useEffect(() => {
    if (citiesData) {
      setCities(citiesData);
    }
  }, [citiesData]);

  useEffect(() => {
    if (countiesData) {
      setCounties(countiesData);
    }
  }, [countiesData]);

  const handleStateChange = (value: string) => {
    const newState = value === "all" ? "" : value;
    onStateChange(newState);
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
    <div className="bg-white shadow-sm py-4 rounded-md">
      <div className="grid md:grid-cols-5 gap-4">
        <div className="flex flex-col">
          <label htmlFor="state" className="mb-1 font-medium text-sm">Filter by State</label>
          <Select value={selectedState || "all"} onValueChange={handleStateChange}>
            <SelectTrigger className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#2A6B7C]">
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
          <label htmlFor="city" className="mb-1 font-medium text-sm">Filter by City</label>
          <Select value={selectedCity || "all"} onValueChange={handleCityChange}>
            <SelectTrigger className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#2A6B7C]">
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
          <label htmlFor="county" className="mb-1 font-medium text-sm">Filter by County</label>
          <Select value={selectedCounty || "all"} onValueChange={handleCountyChange}>
            <SelectTrigger className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#2A6B7C]">
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
        
        <div className="flex flex-col">
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
        </div>
        
        <div className="flex items-end justify-end">
          <div className="text-sm font-medium text-gray-700">{bookshopCount} bookshops found</div>
        </div>
      </div>
    </div>
  );
};

export default FilterControls;
