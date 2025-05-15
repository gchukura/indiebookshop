import React, { useState, useEffect } from 'react';
import { useLazyLoading } from '../lib/imageUtils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  loading?: 'lazy' | 'eager';
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  placeholderColor?: string;
  onLoad?: () => void;
  onError?: () => void;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  sizes = '100vw',
  loading = 'lazy',
  objectFit = 'cover',
  placeholderColor = '#f5f5f5',
  onLoad,
  onError
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const { ref, isVisible } = useLazyLoading();
  
  // Handle loading for native lazy loading or our custom implementation
  const handleLoad = () => {
    setIsLoaded(true);
    if (onLoad) onLoad();
  };
  
  const handleError = () => {
    setError(true);
    if (onError) onError();
  };
  
  // Reset states if src changes
  useEffect(() => {
    setIsLoaded(false);
    setError(false);
  }, [src]);
  
  // Placeholder styles
  const placeholderStyles = {
    backgroundColor: placeholderColor,
    width: width ? `${width}px` : '100%',
    height: height ? `${height}px` : '100%',
    display: (!isLoaded || error) ? 'block' : 'none',
  };
  
  // Image styles
  const imageStyles = {
    objectFit,
    width: width ? `${width}px` : '100%',
    height: height ? `${height}px` : '100%',
    display: (isLoaded && !error) ? 'block' : 'none',
    opacity: isLoaded ? 1 : 0,
    transition: 'opacity 0.3s ease-in-out',
  };
  
  return (
    <div 
      className={`relative overflow-hidden ${className}`}
      style={{ width: width ? `${width}px` : '100%', height: height ? `${height}px` : '100%' }}
      ref={ref as React.RefObject<HTMLDivElement>}
    >
      {/* Placeholder */}
      <div 
        className="absolute inset-0 transition-opacity duration-300 ease-in-out"
        style={placeholderStyles}
        aria-hidden="true"
      >
        {error && (
          <div className="flex items-center justify-center h-full w-full text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>
      
      {/* Actual image, only load when in viewport or if loading is eager */}
      {(isVisible || loading === 'eager') && (
        <img 
          src={src}
          alt={alt}
          width={width}
          height={height}
          onLoad={handleLoad}
          onError={handleError}
          style={imageStyles as React.CSSProperties}
          loading={loading}
          sizes={sizes}
          className="transition-opacity duration-300 ease-in-out"
        />
      )}
    </div>
  );
};

export default OptimizedImage;