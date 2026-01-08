/**
 * Utility to dynamically load Mapbox CSS only when needed
 * This reduces initial CSS bundle size by ~8-10 KB
 * 
 * Mapbox CSS is only loaded when a map component is actually rendered,
 * not on every page load.
 * 
 * NOTE: This file must NOT import React to avoid bundling issues.
 * Components handle React state themselves.
 */

let mapboxCssLoaded = false;
let mapboxCssLoading: Promise<void> | null = null;

/**
 * Dynamically load Mapbox CSS if not already loaded
 * This function is idempotent - safe to call multiple times
 * Returns a promise that resolves when CSS is loaded
 */
export function loadMapboxCss(): Promise<void> {
  // If already loaded, return immediately
  if (mapboxCssLoaded) {
    return Promise.resolve();
  }

  // If currently loading, return the existing promise
  if (mapboxCssLoading) {
    return mapboxCssLoading;
  }

  // Start loading
  mapboxCssLoading = new Promise((resolve, reject) => {
    // Check if link already exists (from index.html or previous load)
    const existingLink = document.querySelector('link[href*="mapbox-gl.css"]');
    if (existingLink) {
      mapboxCssLoaded = true;
      mapboxCssLoading = null;
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
      mapboxCssLoading = null;
      resolve();
    };

    link.onerror = () => {
      mapboxCssLoading = null;
      reject(new Error('Failed to load Mapbox CSS'));
    };

    // Append to head
    document.head.appendChild(link);
  });

  return mapboxCssLoading;
}
// Version: 1767906265
