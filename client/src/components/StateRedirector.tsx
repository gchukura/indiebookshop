import { useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { 
  getStateAbbreviationFromName,
  getStateNameFromAbbreviation,
  createSlug
} from '@/lib/urlUtils';

/**
 * Component that handles redirects from state abbreviation URLs to full state name URLs
 * Example: /bookshops/wa → /bookshops/washington
 */
const StateRedirector = () => {
  const [location, setLocation] = useLocation();
  const params = useParams<{ state: string }>();
  const { state } = params;

  useEffect(() => {
    if (!state) return;
    
    // Check if the state parameter is an abbreviation (2 characters)
    const isAbbreviation = state.length === 2;
    
    if (isAbbreviation) {
      // Convert abbreviation to full state name
      const stateAbbr = state.toUpperCase();
      const stateName = getStateNameFromAbbreviation(stateAbbr);
      
      if (stateName) {
        const stateSlug = createSlug(stateName);
        // Create new URL with full state name
        const newUrl = location.replace(`/bookshops/${state}`, `/bookshops/${stateSlug}`);
        setLocation(newUrl);
      }
    } else {
      // Check if this is a state name that should be normalized
      // For example "new-york" should be normalized to "New-York"
      const stateAbbr = getStateAbbreviationFromName(state);
      
      if (stateAbbr) {
        const properStateName = getStateNameFromAbbreviation(stateAbbr);
        const properStateSlug = createSlug(properStateName);
        
        // Only redirect if the current URL doesn't match the proper state name format
        if (properStateSlug !== state) {
          const newUrl = location.replace(`/bookshops/${state}`, `/bookshops/${properStateSlug}`);
          setLocation(newUrl);
        }
      }
    }
  }, [location, state, setLocation]);

  return null; // This component doesn't render anything
};

export default StateRedirector;