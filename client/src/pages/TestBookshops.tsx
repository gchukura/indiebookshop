import { useState, useEffect } from "react";
import { Bookstore } from "@shared/schema";

const TestBookshops = () => {
  const [state, setState] = useState("NH");
  const [bookshops, setBookshops] = useState<Bookstore[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBookshops = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/bookstores/filter?state=${state}`);
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`Found ${data.length} bookshops for ${state}`);
      setBookshops(data);
    } catch (err) {
      console.error("Error fetching bookshops:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Test Bookshops Page</h1>
      
      <div className="mb-4">
        <input 
          type="text" 
          value={state} 
          onChange={(e) => setState(e.target.value)}
          className="border p-2 mr-2"
          placeholder="Enter state (e.g., NH)"
        />
        <button 
          onClick={fetchBookshops}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Load Bookshops
        </button>
      </div>
      
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}
      
      <div>
        <h2 className="text-xl font-semibold mb-2">
          {bookshops.length} bookshops for {state}
        </h2>
        <ul className="space-y-2">
          {bookshops.map(bookshop => (
            <li key={bookshop.id} className="border p-2 rounded">
              <div className="font-bold">{bookshop.name}</div>
              <div>{bookshop.city}, {bookshop.state}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default TestBookshops;