import { Bookstore, Feature } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
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

  // Define a memoized features map for performance
  const featuresMap = useMemo(() => {
    if (!features) return new Map();
    return new Map(features.map(feature => [feature.id, feature]));
  }, [features]);
  
  // Get feature names for a bookshop - optimized version
  const getBookshopFeatures = (bookshop: Bookstore) => {
    if (!features || !bookshop.featureIds) return [];
    
    // Using the map for O(1) lookups instead of filtering the array each time
    return bookshop.featureIds
      .map(id => featuresMap.get(id))
      .filter(Boolean) as Feature[];
  };

  return (
    <div className="w-full">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">City</TableHead>
              <TableHead className="font-semibold">State</TableHead>
              <TableHead className="font-semibold">Features</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookshops.map((bookshop) => (
              <TableRow 
                key={bookshop.id} 
                className="hover:bg-gray-50 cursor-pointer" 
                onClick={() => showDetails(bookshop.id)}
              >
                <TableCell className="font-medium">{bookshop.name}</TableCell>
                <TableCell>{bookshop.city}</TableCell>
                <TableCell>{bookshop.state}</TableCell>
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
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 my-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <div className="text-sm">
            Page {currentPage} of {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default BookshopTable;