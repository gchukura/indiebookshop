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
        
        // Log fetch attempt
        console.log(`SIMPLE: Fetching bookshop with ID ${id}`);
        
        // Direct fetch from API
        const response = await fetch(`/api/bookstores/${id}`);
        
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
    
    // Start fetch if ID is available
    if (id) {
      fetchBookshop();
    } else {
      setError("No bookshop ID provided");
      setLoading(false);
    }
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
  
  // Success state - very minimal display
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold mb-4">{bookshop.name}</h1>
        
        <div className="mb-6 text-lg">
          <p>{bookshop.street}</p>
          <p>{bookshop.city}, {bookshop.state} {bookshop.zip}</p>
        </div>
        
        <div className="mb-6">
          <p className="whitespace-pre-line">{bookshop.description}</p>
        </div>
        
        {bookshop.website && (
          <div className="mb-4">
            <a 
              href={bookshop.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Visit Website
            </a>
          </div>
        )}
        
        <div className="mt-8">
          <button
            onClick={() => setLocation('/directory')}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-4"
          >
            Back to Directory
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
  );
};

export default SimpleBookshopPage;