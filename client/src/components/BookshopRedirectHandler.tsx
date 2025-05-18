import { useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Bookstore } from '@shared/schema';
import { 
  getStateAbbreviationFromName, 
  createBookshopUrl,
  extractBookshopIdFromPath
} from '@/lib/urlUtils';

/**
 * This component handles redirects for legacy bookshop URLs to the new SEO-friendly format
 */
const BookshopRedirectHandler = () => {
  const [location, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const bookshopId = parseInt(params.id);

  // Fetch bookshop data to create the SEO-friendly URL
  const { data: bookshop, isLoading } = useQuery<Bookstore>({
    queryKey: [`/api/bookstores/${bookshopId}`],
    enabled: !isNaN(bookshopId),
  });

  useEffect(() => {
    // Only redirect if we have the bookshop data and we're on the legacy URL path
    if (!isLoading && bookshop && location.startsWith('/bookshop/') && /\/bookshop\/\d+$/.test(location)) {
      const newUrl = createBookshopUrl(bookshop);
      setLocation(newUrl);
    }
  }, [bookshop, isLoading, location, setLocation]);

  return null; // This is just a redirect handler, it doesn't render anything
};

/**
 * This component handles redirects for state abbreviation URLs to the full state name format
 */
export const StateNameRedirectHandler = () => {
  const [location, setLocation] = useLocation();
  const params = useParams<{ state: string }>();
  const stateAbbr = params.state?.toUpperCase();

  useEffect(() => {
    // Check if we're on a URL with a state abbreviation
    if (stateAbbr && location.includes(`/bookshops/${stateAbbr.toLowerCase()}`)) {
      // Import the utility function to get the full state name
      const { getStateNameFromAbbreviation, createSlug } = require('@/lib/urlUtils');
      const stateName = getStateNameFromAbbreviation(stateAbbr);
      const stateSlug = createSlug(stateName);
      
      // Create the new URL with the full state name
      const newUrl = location.replace(`/bookshops/${stateAbbr.toLowerCase()}`, `/bookshops/${stateSlug}`);
      setLocation(newUrl);
    }
  }, [location, setLocation, stateAbbr]);

  return null;
};

export default BookshopRedirectHandler;