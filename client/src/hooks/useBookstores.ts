import { useQuery } from "@tanstack/react-query";
import { Bookstore as Bookshop } from "@shared/schema";
import { logger } from "@/lib/logger";
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
  const { data, isLoading, isError, refetch } = useQuery<Bookshop[]>({
    queryKey: ['bookstores', state || 'all', featureIds?.join(',') || 'all'],
    queryFn: async () => {
      try {
        const response = await fetch(endpoint);
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText };
          }
          logger.error('API error in useBookstores', new Error(errorData.message || 'Failed to fetch bookstores'), {
            endpoint,
            status: response.status,
            filters: { state, city, featureIds }
          });
          throw new Error(errorData.message || 'Failed to fetch bookstores');
        }
        const data = await response.json();
        logger.debug('Bookstores fetched successfully', { endpoint, count: data.length, filters: { state, city, featureIds } });
        return data;
      } catch (error) {
        logger.error('Fetch error in useBookstores', error, {
          endpoint,
          filters: { state, city, featureIds }
        });
        throw error;
      }
    }
  });
  
  return {
    bookshops: data || [],
    isLoading,
    isError,
    refetch
  };
};
