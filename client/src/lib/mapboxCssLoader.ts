/**
 * Utility to dynamically load Mapbox CSS only when needed
 * This reduces initial CSS bundle size by ~8-10 KB
 * 
 * Mapbox CSS is only loaded when a map component is actually rendered,
 * not on every page load.
 */

import * as React from 'react';

let mapboxCssLoaded = false;
let mapboxCssLoading = false;

/**
 * Dynamically load Mapbox CSS if not already loaded
 * This function is idempotent - safe to call multiple times
 */
export function loadMapboxCss(): Promise<void> {
  // If already loaded, return immediately
  if (mapboxCssLoaded) {
    return Promise.resolve();
  }

  // If currently loading, wait for the existing promise
  if (mapboxCssLoading) {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (mapboxCssLoaded) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 50);
    });
  }

  // Start loading
  mapboxCssLoading = true;

  return new Promise((resolve, reject) => {
    // Check if link already exists (from index.html or previous load)
    const existingLink = document.querySelector('link[href*="mapbox-gl.css"]');
    if (existingLink) {
      mapboxCssLoaded = true;
      mapboxCssLoading = false;
      resolve();
      return;
    }

    // Create link element
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
    link.crossOrigin = 'anonymous';

    link.onload = () => {
      mapboxCssLoaded = true;
      mapboxCssLoading = false;
      resolve();
    };

    link.onerror = () => {
      mapboxCssLoading = false;
      reject(new Error('Failed to load Mapbox CSS'));
    };

    // Append to head
    document.head.appendChild(link);
  });
}

/**
 * Hook to load Mapbox CSS in React components
 * Usage: useMapboxCss() in map components
 */
export function useMapboxCss() {
  const [loaded, setLoaded] = React.useState(mapboxCssLoaded);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (mapboxCssLoaded) {
      setLoaded(true);
      return;
    }

    loadMapboxCss()
      .then(() => {
        setLoaded(true);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error('Failed to load Mapbox CSS'));
        setLoaded(false);
      });
  }, []);

  return { loaded, error };
}
