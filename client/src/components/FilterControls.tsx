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

interface FilterControlsProps {
  bookshopCount: number;
  onStateChange: (state: string) => void;
  onFeatureChange: (featureId: number | null) => void;
  selectedState: string;
  selectedFeature: number | null;
}

const FilterControls = ({ 
  bookshopCount, 
  onStateChange,
  onFeatureChange,
  selectedState, 
  selectedFeature 
}: FilterControlsProps) => {
  const [states, setStates] = useState<string[]>([]);

  // Fetch all states with bookstores
  const { data: statesData } = useQuery<string[]>({
    queryKey: ["/api/states"],
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

  const handleStateChange = (value: string) => {
    onStateChange(value === "all" ? "" : value);
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
      <div className="grid md:grid-cols-3 gap-4">
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
          <Select value={selectedFeature ? selectedFeature.toString() : "all"} onValueChange={handleFeatureChange}>
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
