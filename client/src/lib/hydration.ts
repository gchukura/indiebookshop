import { queryClient } from './queryClient';

/**
 * TypeScript interface for the global window object with our preloaded state
 */
declare global {
  interface Window {
    __PRELOADED_STATE__?: Record<string, any>;
  }
}

/**
 * Map of route patterns to React Query keys
 */
const QUERY_KEY_MAP: Record<string, (pathParts: string[]) => [string, ...any[]][]> = {
  // Homepage - featured bookshops
  '/': () => [
    ['/api/bookstores/featured']
  ],
  
  // Directory page - states and features
  '/directory': () => [
    ['/api/states'],
    ['/api/features']
  ],
  
  // States list
  '/directory/browse': () => [
    ['/api/states/counts']
  ],
  
  // Individual bookshop
  '/bookshop': (parts) => {
    const id = parseInt(parts[1]);
    if (isNaN(id)) return [];
    
    return [
      ['/api/bookstores', id],
      ['/api/events/bookshop', id]
    ];
  },
  
  // State directory
  '/directory/state': (parts) => {
    const state = parts[2];
    if (!state) return [];
    
    return [
      ['/api/bookstores/filter', { state }]
    ];
  },
  
  // City directory
  '/directory/city': (parts) => {
    const city = parts[2];
    if (!city) return [];
    
    return [
      ['/api/bookstores/filter', { city }]
    ];
  },
  
  // Category directory
  '/directory/category': (parts) => {
    const featureId = parseInt(parts[2]);
    if (isNaN(featureId)) return [];
    
    return [
      ['/api/bookstores/filter', { featureIds: [featureId] }],
      ['/api/features', featureId]
    ];
  }
};

/**
 * Maps a pathname to query keys that should be populated
 */
function getQueryKeysForPath(pathname: string): [string, ...any[]][] {
  const pathParts = pathname.split('/').filter(Boolean);
  
  // Check exact path matches first
  if (QUERY_KEY_MAP[pathname]) {
    return QUERY_KEY_MAP[pathname]([]);
  }
  
  // Check pattern matches
  for (const pattern of Object.keys(QUERY_KEY_MAP)) {
    const patternParts = pattern.split('/').filter(Boolean);
    
    if (pathParts[0] === patternParts[0]) {
      if (
        // /directory/state/* pattern
        (pattern === '/directory/state' && pathParts[0] === 'directory' && pathParts[1] === 'state') ||
        // /directory/city/* pattern
        (pattern === '/directory/city' && pathParts[0] === 'directory' && pathParts[1] === 'city') ||
        // /directory/category/* pattern
        (pattern === '/directory/category' && pathParts[0] === 'directory' && pathParts[1] === 'category') ||
        // /bookshop/* pattern
        (pattern === '/bookshop' && pathParts[0] === 'bookshop')
      ) {
        return QUERY_KEY_MAP[pattern](pathParts);
      }
    }
  }
  
  return [];
}

/**
 * Maps preloaded state keys to query keys
 */
function mapStateToQueryKeys(state: Record<string, any>, pathname: string): void {
  const queryKeys = getQueryKeysForPath(pathname);
  
  if (state.featuredBookshops) {
    queryClient.setQueryData(['/api/bookstores/featured'], state.featuredBookshops);
  }
  
  if (state.states) {
    queryClient.setQueryData(['/api/states'], state.states);
  }
  
  if (state.features) {
    queryClient.setQueryData(['/api/features'], state.features);
  }
  
  if (state.stateMap) {
    queryClient.setQueryData(['/api/states/counts'], state.stateMap);
  }
  
  if (state.bookshop) {
    const id = state.bookshop.id;
    queryClient.setQueryData(['/api/bookstores', id], state.bookshop);
  }
  
  if (state.events) {
    const bookshopId = state.bookshop?.id;
    if (bookshopId) {
      queryClient.setQueryData(['/api/events/bookshop', bookshopId], state.events);
    }
  }
  
  if (state.bookshops) {
    if (state.state) {
      queryClient.setQueryData(
        ['/api/bookstores/filter', { state: state.state }],
        state.bookshops
      );
    } else if (state.city) {
      queryClient.setQueryData(
        ['/api/bookstores/filter', { city: state.city }],
        state.bookshops
      );
    } else if (state.feature) {
      queryClient.setQueryData(
        ['/api/bookstores/filter', { featureIds: [state.feature.id] }],
        state.bookshops
      );
      queryClient.setQueryData(['/api/features', state.feature.id], state.feature);
    }
  }
}

/**
 * Hydrate the app with preloaded state from the server
 */
export function hydrateFromServer(): void {
  // Check if we have preloaded state from SSR
  const preloadedState = window.__PRELOADED_STATE__;
  if (!preloadedState) return;
  
  try {
    // Map the preloaded state to React Query cache
    mapStateToQueryKeys(preloadedState, window.location.pathname);
    
    // Clean up the global variable
    delete window.__PRELOADED_STATE__;
    
    // Remove the script element
    const stateScript = document.getElementById('__PRELOADED_STATE__');
    if (stateScript && stateScript.parentNode) {
      stateScript.parentNode.removeChild(stateScript);
    }
    
    console.log('Hydrated app from server-side data');
  } catch (e) {
    console.error('Error hydrating app from server state:', e);
  }
}