import { useState, useEffect } from 'react';

type BreakpointKey = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

// Define breakpoints that match Tailwind default breakpoints
const breakpoints: Record<BreakpointKey, number> = {
  'xs': 0,
  'sm': 640,
  'md': 768,
  'lg': 1024,
  'xl': 1280,
  '2xl': 1536
};

/**
 * Custom hook to check if the current window width is greater than or equal to a specified breakpoint
 * @param breakpoint The breakpoint to check against (xs, sm, md, lg, xl, 2xl)
 * @returns Boolean indicating whether the current viewport is at least the size of the specified breakpoint
 */
export function useBreakpoint(breakpoint: BreakpointKey): boolean {
  const [isAboveBreakpoint, setIsAboveBreakpoint] = useState<boolean>(() => {
    // Default to true for server-side rendering
    if (typeof window === 'undefined') return true;
    
    return window.innerWidth >= breakpoints[breakpoint];
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      setIsAboveBreakpoint(window.innerWidth >= breakpoints[breakpoint]);
    };

    // Set the initial value
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isAboveBreakpoint;
}

/**
 * Hook to detect if the user is on a mobile device
 * @returns Boolean indicating if the viewport is mobile-sized
 */
export function useMobile(): boolean {
  return !useBreakpoint('md'); // Consider anything below 'md' (768px) as mobile
}

/**
 * Hook to detect if the user is on a tablet device
 * @returns Boolean indicating if the viewport is tablet-sized
 */
export function useTablet(): boolean {
  const aboveMd = useBreakpoint('md');
  const belowLg = !useBreakpoint('lg');
  return aboveMd && belowLg; // Between 'md' (768px) and 'lg' (1024px)
}

/**
 * Hook to detect if the user is on a desktop device
 * @returns Boolean indicating if the viewport is desktop-sized
 */
export function useDesktop(): boolean {
  return useBreakpoint('lg'); // Consider anything above 'lg' (1024px) as desktop
}

/**
 * Hook to get the current device type
 * @returns The current device type as a string ('mobile', 'tablet', or 'desktop')
 */
export function useDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const isMobile = useMobile();
  const isTablet = useTablet();
  
  if (isMobile) return 'mobile';
  if (isTablet) return 'tablet';
  return 'desktop';
}

/**
 * Hook to get a value based on the current breakpoint
 * @param values Object with values for each breakpoint
 * @returns The value for the current breakpoint
 */
export function useResponsiveValue<T>(values: Partial<Record<BreakpointKey, T>>): T | undefined {
  const [currentValue, setCurrentValue] = useState<T | undefined>();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const width = window.innerWidth;
      
      // Find the largest breakpoint that's smaller than or equal to the current width
      const activeBreakpoint = (Object.entries(breakpoints) as [BreakpointKey, number][])
        .filter(([_, size]) => width >= size)
        .sort(([_, a], [__, b]) => b - a)[0]?.[0];
      
      if (activeBreakpoint && values[activeBreakpoint] !== undefined) {
        setCurrentValue(values[activeBreakpoint]);
      } else {
        // Find the smallest breakpoint that has a defined value
        const smallestDefinedBreakpoint = (Object.entries(breakpoints) as [BreakpointKey, number][])
          .filter(([key]) => values[key as BreakpointKey] !== undefined)
          .sort(([_, a], [__, b]) => a - b)[0]?.[0];
        
        if (smallestDefinedBreakpoint) {
          setCurrentValue(values[smallestDefinedBreakpoint as BreakpointKey]);
        }
      }
    };

    // Set the initial value
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [values]);

  return currentValue;
}

export default {
  useBreakpoint,
  useMobile,
  useTablet, 
  useDesktop,
  useDeviceType,
  useResponsiveValue
};