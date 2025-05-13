import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFilters } from "@/hooks/useFilters";
import { Feature } from "@shared/schema";

interface FilterControlsProps {
  bookstoreCount: number;
}

const FilterControls = ({ bookstoreCount }: FilterControlsProps) => {
  const { filters, updateFilters } = useFilters();
  const [states, setStates] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);

  // Fetch all states with bookstores
  const { data: statesData } = useQuery<string[]>({
    queryKey: ["/api/states"],
  });

  // Fetch features for dropdown
  const { data: featuresData } = useQuery<Feature[]>({
    queryKey: ["/api/features"],
  });

  // Fetch cities when state changes
  const { data: citiesData } = useQuery<string[]>({
    queryKey: ["/api/states", filters.state, "cities"],
    enabled: !!filters.state,
  });

  useEffect(() => {
    if (statesData) {
      setStates(statesData);
    }
  }, [statesData]);

  useEffect(() => {
    if (citiesData) {
      setCities(citiesData);
    } else {
      setCities([]);
    }
  }, [citiesData]);

  const handleStateChange = (value: string) => {
    updateFilters({ state: value === "all" ? "" : value, city: "" });
  };

  const handleCityChange = (value: string) => {
    updateFilters({ city: value === "all" ? "" : value });
  };

  const handleFeatureChange = (value: string) => {
    if (value === "all") {
      updateFilters({ featureIds: [] });
      return;
    }
    
    const featureId = parseInt(value);
    updateFilters({ 
      featureIds: featureId ? [featureId] : [] 
    });
  };

  return (
    <div className="bg-white shadow-sm py-4 rounded-md">
      <div className="grid md:grid-cols-3 gap-4">
        <div className="flex flex-col">
          <label htmlFor="state" className="mb-1 font-medium text-sm">Filter by State</label>
          <Select value={filters.state || "all"} onValueChange={handleStateChange}>
            <SelectTrigger className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#2A6B7C]">
              <SelectValue placeholder="All States" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              {states && states.length > 0 ? (
                states
                  .filter(state => state && state.trim() !== "" && state !== "#ERROR!")
                  .sort()
                  .map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))
              ) : null}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex flex-col">
          <label htmlFor="feature" className="mb-1 font-medium text-sm">Filter by Feature</label>
          <Select value={filters.featureIds?.length ? filters.featureIds[0].toString() : "all"} onValueChange={handleFeatureChange}>
            <SelectTrigger className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#2A6B7C]">
              <SelectValue placeholder="All Features" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Features</SelectItem>
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
          <div className="text-sm font-medium text-gray-700">{bookstoreCount} bookstores found</div>
        </div>
      </div>
    </div>
  );
};

export default FilterControls;
