import { Link } from "wouter";
import { Bookstore, Feature } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import BookshopIcon from "./BookshopIcon";
import OptimizedImage from "./OptimizedImage";
import { 
  generateBookshopImageAlt, 
  optimizeImageUrl 
} from "../lib/imageUtils";
import { createBookshopUrl } from "../lib/urlUtils";

interface BookshopCardProps {
  bookstore: Bookstore; // using bookstore for backward compatibility, but will be renamed to bookshop in the prop
  showDetails: (id: number) => void;
}

const BookshopCard = ({ bookstore: bookshop, showDetails }: BookshopCardProps) => {
  // Fetch all features to match with bookshop.featureIds
  const { data: features } = useQuery<Feature[]>({
    queryKey: ["/api/features"],
  });

  // Get feature names for the bookshop
  const bookshopFeatures = features?.filter(feature => 
    bookshop.featureIds?.includes(feature.id) || false
  ) || [];

  return (
    <div className="bookshop-card bg-white border border-gray-100 rounded-lg shadow-sm mb-4 transition duration-200 ease-in-out overflow-hidden hover:shadow-md hover:-translate-y-1">
      <div className="flex flex-col sm:flex-row">
        <div className="sm:w-1/3">
          <Link 
            href={createBookshopUrl(bookshop)}
            className="w-full h-40 sm:h-full cursor-pointer block" 
          >
            {bookshop.imageUrl ? (
              <OptimizedImage 
                src={optimizeImageUrl(bookshop.imageUrl, 'card')} 
                alt={generateBookshopImageAlt(
                  bookshop.name, 
                  bookshop.city, 
                  bookshop.state, 
                  bookshopFeatures.map(f => f.name)
                )}
                className="w-full h-full"
                objectFit="cover"
                loading="lazy"
                sizes="(max-width: 640px) 100vw, 33vw"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookshopIcon size={100} />
              </div>
            )}
          </Link>
        </div>
        <div className="p-4 sm:w-2/3">
          <div>
            <Link 
              href={createBookshopUrl(bookshop)}
              className="font-serif font-bold text-lg cursor-pointer hover:text-[#2A6B7C] block"
            >
              {bookshop.name}
            </Link>
          </div>
          <div className="text-sm text-gray-600 mb-2">
            <MapPin className="h-4 w-4 inline mr-1" /> {bookshop.city}, {bookshop.state}
          </div>
          <p className="text-sm mb-3 line-clamp-2">{bookshop.description}</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {bookshopFeatures.map(feature => (
              <span key={feature.id} className="shop-feature-tag bg-[rgba(42,107,124,0.1)] text-[#2A6B7C] rounded-full px-3 py-1 text-xs font-semibold">
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

export default BookshopCard;
