import { Link } from "wouter";
import { Bookstore, Feature } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import BookstoreIcon from "./BookstoreIcon";

interface BookstoreCardProps {
  bookstore: Bookstore;
  showDetails: (id: number) => void;
}

const BookstoreCard = ({ bookstore, showDetails }: BookstoreCardProps) => {
  // Fetch all features to match with bookstore.featureIds
  const { data: features } = useQuery<Feature[]>({
    queryKey: ["/api/features"],
  });

  // Get feature names for the bookstore
  const bookstoreFeatures = features?.filter(feature => 
    bookstore.featureIds?.includes(feature.id) || false
  ) || [];

  return (
    <div className="bookstore-card bg-white border border-gray-100 rounded-lg shadow-sm mb-4 transition duration-200 ease-in-out overflow-hidden hover:shadow-md hover:-translate-y-1">
      <div className="flex flex-col sm:flex-row">
        <div className="sm:w-1/3">
          <div 
            className="w-full h-40 sm:h-full cursor-pointer" 
            onClick={() => showDetails(bookstore.id)}
          >
            {bookstore.imageUrl ? (
              <img 
                src={bookstore.imageUrl} 
                alt={`${bookstore.name} storefront`} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookstoreIcon size={100} />
              </div>
            )}
          </div>
        </div>
        <div className="p-4 sm:w-2/3">
          <div>
            <h3 
              className="font-serif font-bold text-lg cursor-pointer hover:text-[#2A6B7C]"
              onClick={() => showDetails(bookstore.id)}
            >
              {bookstore.name}
            </h3>
          </div>
          <div className="text-sm text-gray-600 mb-2">
            <MapPin className="h-4 w-4 inline mr-1" /> {bookstore.city}, {bookstore.state}
          </div>
          <p className="text-sm mb-3 line-clamp-2">{bookstore.description}</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {bookstoreFeatures.map(feature => (
              <span key={feature.id} className="store-feature-tag bg-[rgba(42,107,124,0.1)] text-[#2A6B7C] rounded-full px-3 py-1 text-xs font-semibold">
                {feature.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Custom components for icons to match the design
const MapPin = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
};

const ArrowRight = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
};

export default BookstoreCard;
