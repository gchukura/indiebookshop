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

interface BookstoreTableProps {
  bookstores: Bookstore[];
  showDetails: (id: number) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const BookstoreTable = ({ 
  bookstores, 
  showDetails, 
  currentPage, 
  totalPages, 
  onPageChange 
}: BookstoreTableProps) => {
  // Fetch all features to match with bookstore.featureIds
  const { data: features } = useQuery<Feature[]>({
    queryKey: ["/api/features"],
  });

  // Get feature names for a bookstore
  const getBookstoreFeatures = (bookstore: Bookstore) => {
    return features?.filter(feature => 
      bookstore.featureIds?.includes(feature.id) || false
    ) || [];
  };

  return (
    <div className="w-full">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Location</TableHead>
              <TableHead className="font-semibold">Features</TableHead>
              <TableHead className="font-semibold w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookstores.map((bookstore) => (
              <TableRow key={bookstore.id} className="hover:bg-gray-50">
                <TableCell className="font-medium">{bookstore.name}</TableCell>
                <TableCell>{bookstore.city}, {bookstore.state}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {getBookstoreFeatures(bookstore).slice(0, 3).map(feature => (
                      <span key={feature.id} className="bg-[rgba(42,107,124,0.1)] text-[#2A6B7C] rounded-full px-2 py-0.5 text-xs">
                        {feature.name}
                      </span>
                    ))}
                    {getBookstoreFeatures(bookstore).length > 3 && (
                      <span className="text-gray-500 text-xs">+{getBookstoreFeatures(bookstore).length - 3} more</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => showDetails(bookstore.id)}
                    className="text-[#2A6B7C] hover:text-[#E16D3D] h-8 px-2"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Details
                  </Button>
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

export default BookstoreTable;