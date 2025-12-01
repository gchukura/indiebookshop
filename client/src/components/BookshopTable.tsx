import { Bookstore, Feature } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { generateSlugFromName } from "../lib/linkUtils";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface BookshopTableProps {
  bookshops: Bookstore[];
  showDetails: (id: number) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const BookshopTable = ({ 
  bookshops, 
  showDetails, 
  currentPage, 
  totalPages, 
  onPageChange 
}: BookshopTableProps) => {
  // Fetch all features to match with bookshop.featureIds
  const { data: features } = useQuery<Feature[]>({
    queryKey: ["/api/features"],
  });

  // Get feature names for a bookshop
  const getBookshopFeatures = (bookshop: Bookstore) => {
    return features?.filter(feature => 
      bookshop.featureIds?.includes(feature.id) || false
    ) || [];
  };

  return (
    <div className="w-full">
      {/* Mobile Card View */}
      <div className="block md:hidden space-y-3">
        {bookshops.map((bookshop) => {
          const slug = generateSlugFromName(bookshop.name) || String(bookshop.id);
          const bookshopUrl = `/bookshop/${slug}`;
          
          return (
          <div
            key={bookshop.id}
            className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <Link 
              to={bookshopUrl}
              className="block"
            >
              <h3 className="font-semibold text-base text-[#5F4B32] hover:text-[#2A6B7C] mb-2 line-clamp-2 transition-colors">{bookshop.name || 'Unnamed Bookshop'}</h3>
            </Link>
            <div className="space-y-1.5 mb-3">
              <div className="flex items-center text-sm text-gray-600">
                <span className="font-medium mr-1">Location:</span>
                <span>
                  {bookshop.city || ''}
                  {bookshop.city && bookshop.state ? ', ' : ''}
                  {bookshop.state || ''}
                </span>
              </div>
              {(bookshop.street || bookshop.city || bookshop.state) && (
                <div className="text-xs text-gray-500">
                  {[bookshop.street, bookshop.city, bookshop.state, bookshop.zip].filter(Boolean).join(', ')}
                </div>
              )}
            </div>
            {getBookshopFeatures(bookshop).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-100">
                {getBookshopFeatures(bookshop).slice(0, 3).map(feature => (
                  <span key={feature.id} className="bg-[rgba(42,107,124,0.1)] text-[#2A6B7C] rounded-full px-2.5 py-1 text-xs font-medium">
                    {feature.name}
                  </span>
                ))}
                {getBookshopFeatures(bookshop).length > 3 && (
                  <span className="text-gray-500 text-xs self-center">+{getBookshopFeatures(bookshop).length - 3} more</span>
                )}
              </div>
            )}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <Link 
                to={bookshopUrl}
                className="text-sm text-[#2A6B7C] hover:text-[#E16D3D] hover:underline font-medium inline-flex items-center gap-1"
              >
                View details →
              </Link>
            </div>
          </div>
          );
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="bg-[#F7F3E8] text-[#5F4B32] font-serif font-bold">Name</TableHead>
              <TableHead className="bg-[#F7F3E8] text-[#5F4B32] font-serif font-bold">City</TableHead>
              <TableHead className="bg-[#F7F3E8] text-[#5F4B32] font-serif font-bold">State</TableHead>
              <TableHead className="bg-[#F7F3E8] text-[#5F4B32] font-serif font-bold">Features</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookshops.map((bookshop) => {
              const slug = generateSlugFromName(bookshop.name) || String(bookshop.id);
              const bookshopUrl = `/bookshop/${slug}`;
              
              return (
              <TableRow 
                key={bookshop.id} 
                className="hover:bg-gray-50 transition-colors"
              >
                <TableCell className="font-medium">
                  <Link 
                    to={bookshopUrl}
                    className="text-[#2A6B7C] hover:text-[#E16D3D] font-semibold transition-colors hover:underline"
                  >
                    {bookshop.name || 'Unnamed Bookshop'}
                  </Link>
                </TableCell>
                <TableCell>{bookshop.city || '-'}</TableCell>
                <TableCell>{bookshop.state || '-'}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {getBookshopFeatures(bookshop).slice(0, 3).map(feature => (
                      <span key={feature.id} className="bg-[rgba(42,107,124,0.1)] text-[#2A6B7C] rounded-full px-2 py-0.5 text-xs">
                        {feature.name}
                      </span>
                    ))}
                    {getBookshopFeatures(bookshop).length > 3 && (
                      <span className="text-gray-500 text-xs">+{getBookshopFeatures(bookshop).length - 3} more</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 md:space-x-3 my-4 md:my-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="min-h-[44px] md:min-h-0 px-4 md:px-3"
          >
            Previous
          </Button>
          <div className="text-sm md:text-base font-medium">
            Page {currentPage} of {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="min-h-[44px] md:min-h-0 px-4 md:px-3"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default BookshopTable;