import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';

/**
 * A minimal bookshop detail page to troubleshoot display issues
 */
const SimpleBookshopPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [_, setLocation] = useLocation();
  const [bookshop, setBookshop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch bookshop on component mount
  useEffect(() => {
    const fetchBookshop = async () => {
      try {
        // Show loading state
        setLoading(true);
        setError(null);
        
        // Debug URL params
        console.log("SIMPLE DEBUG: URL params", {
          id: id,
          paramType: typeof id,
          location: window.location.pathname
        });
        
        // Extract ID directly from URL if needed
        const urlPath = window.location.pathname;
        
        // Check if URL is exactly in /bookshop/{digits} format
        const exactNumericMatch = urlPath.match(/^\/bookshop\/(\d+)$/);
        
        // If exact numeric match, use that ID
        const bookshopId = exactNumericMatch?.[1] || id;
        
        console.log(`SIMPLE: Fetching bookshop with ID ${bookshopId}`);
        
        if (!bookshopId) {
          throw new Error("No bookshop ID found in URL");
        }
        
        // Direct fetch from API
        const response = await fetch(`/api/bookstores/${bookshopId}`);
        
        // Handle API errors
        if (!response.ok) {
          throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }
        
        // Parse response
        const data = await response.json();
        console.log("SIMPLE: Received data:", data);
        
        // Validate data
        if (!data || !data.name) {
          throw new Error("Invalid bookshop data received");
        }
        
        // Set data to state
        setBookshop(data);
      } catch (err: any) {
        console.error("SIMPLE: Error fetching bookshop:", err);
        setError(err.message || "Failed to load bookshop details");
      } finally {
        setLoading(false);
      }
    };
    
    // Always try to fetch, we'll extract ID from URL if params fail
    fetchBookshop();
  }, [id]);
  
  // Loading state
  if (loading) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Loading Bookshop</h1>
        <p>Please wait while we load bookshop #{id}...</p>
      </div>
    );
  }
  
  // Error state
  if (error || !bookshop) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Bookshop</h1>
        <p className="mb-4">{error || "Unknown error occurred"}</p>
        <button 
          onClick={() => setLocation('/directory')}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Return to Directory
        </button>
      </div>
    );
  }
  
  // Success state - enhanced display
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Breadcrumbs navigation */}
        <div className="mb-4 text-sm text-gray-500">
          <a href="/" className="hover:underline">Home</a> &gt; 
          <a href="/directory" className="hover:underline ml-1">Directory</a> &gt; 
          <a href={`/directory/state/${bookshop.state}`} className="hover:underline ml-1">{bookshop.state}</a> &gt; 
          <span className="ml-1 font-medium">{bookshop.name}</span>
        </div>
        
        <h1 className="text-3xl font-bold mb-4">{bookshop.name}</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left column: Main info */}
          <div className="md:col-span-2">
            <div className="mb-6 text-lg">
              <p>{bookshop.street}</p>
              <p>{bookshop.city}, {bookshop.state} {bookshop.zip}</p>
              {bookshop.county && <p className="text-sm text-gray-600">{bookshop.county}</p>}
            </div>
            
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">About This Bookshop</h2>
              <p className="whitespace-pre-line">{bookshop.description}</p>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-6">
              {bookshop.featureIds && Array.isArray(bookshop.featureIds) && bookshop.featureIds.map((id) => (
                <span key={id} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                  Feature #{id}
                </span>
              ))}
            </div>
          </div>
          
          {/* Right column: Contact & links */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
            
            {bookshop.phone && (
              <div className="mb-3">
                <p className="text-sm text-gray-600">Phone:</p>
                <p className="font-medium">{bookshop.phone}</p>
              </div>
            )}
            
            {bookshop.hours && (
              <div className="mb-3">
                <p className="text-sm text-gray-600">Hours:</p>
                <p className="font-medium">{bookshop.hours}</p>
              </div>
            )}
            
            {bookshop.website && (
              <div className="mt-6">
                <a 
                  href={bookshop.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded w-full"
                >
                  Visit Website
                </a>
              </div>
            )}
            
            {/* Map link if coordinates available */}
            {bookshop.latitude && bookshop.longitude && bookshop.latitude !== "Loading..." && (
              <div className="mt-3">
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${bookshop.latitude},${bookshop.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded w-full"
                >
                  View on Map
                </a>
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-8 border-t pt-6">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setLocation('/directory')}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Back to Directory
            </button>
            
            <button
              onClick={() => setLocation(`/directory/state/${bookshop.state}`)}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              More Bookshops in {bookshop.state}
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleBookshopPage;