import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Bookstore as Bookshop } from '@shared/schema';
import { createSlug, getStateNameFromAbbreviation } from '@/lib/urlUtils';

/**
 * This component acts as a unified handler for all bookshop detail URLs
 * It examines the current URL, identifies the bookshop through various patterns,
 * and redirects to the canonical SEO-friendly bookshop detail page
 */
const UnifiedBookshopDetailHandler: React.FC = () => {
  const [location, setLocation] = useLocation();
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  // Possible URL patterns:
  // 1. /bookshop/:id (legacy numeric ID)
  // 2. /bookshop/:name (direct name lookup)
  // 3. /bookshop/:state/:city/:name (standard SEO format)
  // 4. /bookshop/:state/:county/:city/:name (county-enhanced SEO format)

  const params = useParams<{ 
    id?: string;
    name?: string;
    state?: string;
    city?: string;
    county?: string;
  }>();
  
  // Get the path segments to analyze the URL pattern
  const pathSegments = location.split('/').filter(Boolean);
  const isBookshopPath = pathSegments[0] === 'bookshop';
  const segmentCount = pathSegments.length;
  
  // Fetch all bookshops for matching
  const { data: allBookshops, isLoading } = useQuery<Bookshop[]>({
    queryKey: ["/api/bookstores"],
    enabled: isBookshopPath && !isRedirecting
  });
  
  useEffect(() => {
    // Only process if this is a bookshop path and we have the data
    if (!isBookshopPath || isLoading || !allBookshops || isRedirecting) {
      return;
    }
    
    let targetBookshop: Bookshop | undefined;
    
    // Identify the URL pattern and find the corresponding bookshop
    if (segmentCount === 2) {
      // Pattern: /bookshop/:nameOrId
      const nameOrId = pathSegments[1];
      
      // Check if it's a numeric ID
      const id = parseInt(nameOrId);
      if (!isNaN(id)) {
        // Legacy ID-based lookup
        targetBookshop = allBookshops.find(b => b.id === id);
      } else {
        // Direct name-based lookup
        targetBookshop = allBookshops.find(b => createSlug(b.name) === nameOrId);
      }
    } 
    else if (segmentCount === 4) {
      // Pattern: /bookshop/:state/:city/:name
      const [_, stateSlug, citySlug, nameSlug] = pathSegments;
      
      targetBookshop = allBookshops.find(b => {
        const bookshopStateSlug = createSlug(getStateNameFromAbbreviation(b.state));
        const bookshopCitySlug = createSlug(b.city);
        const bookshopNameSlug = createSlug(b.name);
        
        return (
          (bookshopStateSlug === stateSlug || b.state.toLowerCase() === stateSlug) && 
          bookshopCitySlug === citySlug && 
          bookshopNameSlug === nameSlug
        );
      });
    }
    else if (segmentCount === 5) {
      // Pattern: /bookshop/:state/:county/:city/:name
      const [_, stateSlug, countySlug, citySlug, nameSlug] = pathSegments;
      
      targetBookshop = allBookshops.find(b => {
        const bookshopStateSlug = createSlug(getStateNameFromAbbreviation(b.state));
        const bookshopCountySlug = b.county ? createSlug(b.county) : '';
        const bookshopCitySlug = createSlug(b.city);
        const bookshopNameSlug = createSlug(b.name);
        
        return (
          (bookshopStateSlug === stateSlug || b.state.toLowerCase() === stateSlug) && 
          (bookshopCountySlug.includes(countySlug) || countySlug.includes(bookshopCountySlug)) && 
          bookshopCitySlug === citySlug && 
          bookshopNameSlug === nameSlug
        );
      });
    }
    
    // If we found a bookshop, navigate to the canonical detail page URL
    if (targetBookshop) {
      // Create the canonical URL for this bookshop (direct format for simplicity)
      const canonicalUrl = `/bookshop/${createSlug(targetBookshop.name)}`;
      
      // Only redirect if we're not already on the canonical URL
      if (location !== canonicalUrl) {
        setIsRedirecting(true);
        setLocation(canonicalUrl);
      }
    }
  }, [allBookshops, isLoading, isBookshopPath, isRedirecting, location, setLocation, segmentCount, pathSegments]);
  
  // This is just a handler component, it doesn't render anything
  return null;
};

export default UnifiedBookshopDetailHandler;