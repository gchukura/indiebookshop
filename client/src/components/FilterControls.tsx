import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, List } from "lucide-react";
import { useFilters } from "@/hooks/useFilters";
import { Feature } from "@shared/schema";

interface FilterControlsProps {
  view: "map" | "list";
  setView: (view: "map" | "list") => void;
  bookstoreCount: number;
}

const FilterControls = ({ view, setView, bookstoreCount }: FilterControlsProps) => {
  const { filters, updateFilters } = useFilters();
  const [states, setStates] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);

  // Fetch all states with bookstores
  const { data: statesData } = useQuery({
    queryKey: ["/api/states"],
  });

  // Fetch features for dropdown
  const { data: featuresData } = useQuery<Feature[]>({
    queryKey: ["/api/features"],
  });

  // Fetch cities when state changes
  const { data: citiesData } = useQuery({
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
    <div className="bg-white shadow-sm py-4 sticky top-20 z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="md:flex md:justify-between md:items-center">
          <div className="flex space-x-4 items-center overflow-x-auto pb-3 md:pb-0 scrollbar-hide">
            <div className="inline-flex items-center">
              <label htmlFor="state" className="mr-2 font-medium text-sm">State:</label>
              <Select value={filters.state || "all"} onValueChange={handleStateChange}>
                <SelectTrigger className="w-32 border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#2A6B7C]">
                  <SelectValue placeholder="All States" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {states && states.length > 0 ? (
                    states
                      .filter(state => state && state.trim() !== "" && state !== "#ERROR!")
                      .map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))
                  ) : null}
                </SelectContent>
              </Select>
            </div>
            <div className="inline-flex items-center">
              <label htmlFor="city" className="mr-2 font-medium text-sm">City:</label>
              <Select value={filters.city || "all"} onValueChange={handleCityChange} disabled={!filters.state}>
                <SelectTrigger className="w-32 border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#2A6B7C]">
                  <SelectValue placeholder="All Cities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {cities && cities.length > 0 ? (
                    cities
                      .filter(city => city && city.trim() !== "" && city !== "#ERROR!")
                      .map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))
                  ) : null}
                </SelectContent>
              </Select>
            </div>
            <div className="inline-flex items-center">
              <label htmlFor="feature" className="mr-2 font-medium text-sm">Features:</label>
              <Select value={filters.featureIds?.length ? filters.featureIds[0].toString() : "all"} onValueChange={handleFeatureChange}>
                <SelectTrigger className="w-32 border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#2A6B7C]">
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
          </div>
          <div className="flex justify-between mt-4 md:mt-0">
            <div className="flex space-x-2">
              <Button
                id="view-map"
                className={`${
                  view === "map"
                    ? "bg-[#5F4B32] text-white"
                    : "bg-gray-200 text-[#333333] hover:bg-gray-300"
                } px-4 py-2 rounded-md font-medium`}
                onClick={() => setView("map")}
              >
                <MapPin className="h-4 w-4 mr-1" /> Map
              </Button>
              <Button
                id="view-list"
                className={`${
                  view === "list"
                    ? "bg-[#5F4B32] text-white"
                    : "bg-gray-200 text-[#333333] hover:bg-gray-300"
                } px-4 py-2 rounded-md font-medium`}
                onClick={() => setView("list")}
              >
                <List className="h-4 w-4 mr-1" /> List
              </Button>
            </div>
            <div className="hidden md:flex items-center ml-4">
              <span className="text-sm font-medium">{bookstoreCount} bookstores found</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterControls;
