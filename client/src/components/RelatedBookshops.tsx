import React from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bookstore as Bookshop } from '@shared/schema';
import { generateBookshopImageAlt } from '../lib/imageUtils';

interface RelatedBookshopsProps {
  currentBookshop: Bookshop;
}

const RelatedBookshops = ({ currentBookshop }: RelatedBookshopsProps) => {
  const [relatedBookshops, setRelatedBookshops] = React.useState<Bookshop[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchRelatedBookshops = async () => {
      setIsLoading(true);
      try {
        // Fetch bookshops in the same city, excluding the current one
        const response = await fetch(`/api/bookstores/filter?city=${encodeURIComponent(currentBookshop.city)}`);
        const bookshops = await response.json();
        
        // Filter out the current bookshop and limit to 3
        const filteredBookshops = bookshops
          .filter((bookshop: Bookshop) => bookshop.id !== currentBookshop.id)
          .slice(0, 3);
        
        setRelatedBookshops(filteredBookshops);
      } catch (error) {
        console.error('Error fetching related bookshops:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (currentBookshop) {
      fetchRelatedBookshops();
    }
  }, [currentBookshop]);

  if (isLoading) {
    return <div className="my-4 p-4 bg-gray-100 rounded-md animate-pulse h-32"></div>;
  }

  if (relatedBookshops.length === 0) {
    return null; // Don't show anything if there are no related bookshops
  }

  const renderBookshopCard = (bookshop: Bookshop) => (
    <Card key={bookshop.id} className="hover:shadow-md transition-shadow">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-md font-serif">{bookshop.name}</CardTitle>
        <CardDescription className="text-sm truncate">{bookshop.city}, {bookshop.state}</CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <Link 
          to={`/bookshop/${bookshop.id}`}
          className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
        >
          View details →
        </Link>
      </CardContent>
    </Card>
  );

  return (
    <div className="my-6">
      <h3 className="font-serif font-bold text-xl mb-4">More Bookshops in {currentBookshop.city}</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {relatedBookshops.map(renderBookshopCard)}
      </div>
      <div className="mt-4 text-center">
        <Link 
          to={`/directory/city/${encodeURIComponent(currentBookshop.city)}`}
          className="text-blue-600 hover:text-blue-800 hover:underline inline-block"
        >
          See all bookshops in {currentBookshop.city} →
        </Link>
      </div>
    </div>
  );
};

export default RelatedBookshops;