import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { Bookstore as Bookshop } from '@shared/schema';

/**
 * Simple test component for debugging bookshop detail page issues
 */
const TestBookshopPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [_, setLocation] = useLocation();
  const [bookshop, setBookshop] = useState<Bookshop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use direct fetch instead of react-query to simplify debugging
  useEffect(() => {
    const fetchBookshop = async () => {
      try {
        setLoading(true);
        console.log(`Directly fetching bookshop with ID: ${id}`);
        
        // Make direct API request
        const response = await fetch(`/api/bookstores/${id}`);
        
        // Check if the request was successful
        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        
        // Parse the response
        const data = await response.json();
        console.log("Received bookshop data:", data);
        
        if (data && data.name) {
          setBookshop(data);
          setError(null);
        } else {
          setError("Invalid bookshop data received");
          setBookshop(null);
        }
      } catch (err: any) {
        console.error("Error fetching bookshop:", err);
        setError(err.message || "Failed to fetch bookshop details");
        setBookshop(null);
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchBookshop();
    }
  }, [id]);
  
  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto py-10 text-center">
        <p className="text-xl">Loading bookshop {id}...</p>
      </div>
    );
  }
  
  // Error state
  if (error || !bookshop) {
    return (
      <div className="container mx-auto py-10 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
        <p className="mb-4">{error || "Bookshop not found"}</p>
        <button 
          onClick={() => setLocation('/directory')}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Return to Directory
        </button>
      </div>
    );
  }
  
  // Render simple bookshop details
  return (
    <div className="container mx-auto py-10">
      <div className="bg-white shadow-md rounded-lg p-6 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold border-b pb-2 mb-4">{bookshop.name}</h1>
        
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">About</h2>
          <p className="text-gray-700">{bookshop.description}</p>
        </div>
        
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Location</h2>
          <p>{bookshop.street}</p>
          <p>{bookshop.city}, {bookshop.state} {bookshop.zip}</p>
          {bookshop.county && <p>County: {bookshop.county}</p>}
        </div>
        
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Contact</h2>
          <p>Phone: {bookshop.phone || 'Not available'}</p>
          {bookshop.website && (
            <p>
              Website: 
              <a 
                href={bookshop.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline ml-1"
              >
                {bookshop.website}
              </a>
            </p>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Coordinates</h2>
            <p>Latitude: {bookshop.latitude}</p>
            <p>Longitude: {bookshop.longitude}</p>
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-2">Features</h2>
            <p>Feature IDs: {bookshop.featureIds ? JSON.stringify(bookshop.featureIds) : 'None'}</p>
          </div>
        </div>
        
        <div className="flex justify-center mt-8">
          <button 
            onClick={() => setLocation('/directory')}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-4"
          >
            Return to Directory
          </button>
          
          <button 
            onClick={() => window.location.reload()}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestBookshopPage;