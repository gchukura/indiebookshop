import { useQuery } from "@tanstack/react-query";
import { Bookstore } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface UseBookstoresFilters {
  state?: string;
  city?: string;
  featureIds?: number[];
}

export const useBookstores = (filters: UseBookstoresFilters = {}) => {
  const { state, city, featureIds } = filters;
  
  // Build query params based on filters
  const getQueryParams = () => {
    const params = new URLSearchParams();
    
    if (state) {
      params.append('state', state);
    }
    
    if (city) {
      params.append('city', city);
    }
    
    if (featureIds && featureIds.length > 0) {
      params.append('features', featureIds.join(','));
    }
    
    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  };
  
  // Determine if we should use filtered endpoint
  const hasFilters = state || city || (featureIds && featureIds.length > 0);
  
  // Important: The API route is /api/bookstores/filter and needs to come before other routes with parameters
  const endpoint = hasFilters 
    ? `/api/bookstores/filter${getQueryParams()}` 
    : '/api/bookstores';
  
  // Fetch bookstores with the appropriate endpoint
  const { data, isLoading, isError, refetch } = useQuery<Bookstore[]>({
    queryKey: ['bookstores', state || 'all', featureIds?.join(',') || 'all'],
    queryFn: async () => {
      try {
        const response = await fetch(endpoint);
        if (!response.ok) {
          const errorData = await response.json();
          console.error('API error:', errorData);
          throw new Error(errorData.message || 'Failed to fetch bookstores');
        }
        return response.json();
      } catch (error) {
        console.error('Fetch error:', error);
        throw error;
      }
    }
  });
  
  return {
    bookstores: data || [],
    isLoading,
    isError,
    refetch
  };
};
