import { useState, useEffect } from "react";
import { useLocation } from "wouter";

interface Filters {
  state: string;
  city: string;
  featureIds: number[];
}

interface UpdateFilters {
  state?: string;
  city?: string;
  featureIds?: number[];
}

export const useFilters = () => {
  const [location, setLocation] = useLocation();
  const [filters, setFilters] = useState<Filters>({
    state: "",
    city: "",
    featureIds: [],
  });

  // Initialize filters from URL parameters on component mount
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    
    const state = searchParams.get("state") || "";
    const city = searchParams.get("city") || "";
    const features = searchParams.get("features");
    
    const featureIds = features 
      ? features.split(",").map(id => parseInt(id)).filter(id => !isNaN(id))
      : [];
    
    setFilters({ state, city, featureIds });
  }, []);

  // Update URL when filters change
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    
    if (filters.state) {
      searchParams.set("state", filters.state);
    } else {
      searchParams.delete("state");
    }
    
    if (filters.city) {
      searchParams.set("city", filters.city);
    } else {
      searchParams.delete("city");
    }
    
    if (filters.featureIds.length > 0) {
      searchParams.set("features", filters.featureIds.join(","));
    } else {
      searchParams.delete("features");
    }
    
    // Preserve other search parameters (e.g., view, search)
    const newSearch = searchParams.toString();
    
    // Avoid unnecessary history entries
    const currentPath = location.split("?")[0];
    const newLocation = newSearch ? `${currentPath}?${newSearch}` : currentPath;
    
    if (newLocation !== location) {
      setLocation(newLocation, { replace: true });
    }
  }, [filters, location, setLocation]);

  const updateFilters = (newFilters: UpdateFilters) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      ...newFilters,
    }));
  };

  const resetFilters = () => {
    setFilters({
      state: "",
      city: "",
      featureIds: [],
    });
  };

  return { filters, updateFilters, resetFilters };
};
