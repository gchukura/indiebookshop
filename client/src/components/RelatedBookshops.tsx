import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Bookstore as Bookshop } from '@shared/schema';
import BookshopIcon from '@/components/BookshopIcon';

interface RelatedBookshopsProps {
  currentBookshop: Bookshop;
}

const RelatedBookshops = ({ currentBookshop }: RelatedBookshopsProps) => {
  // Fetch bookshops in the same state
  const { data: sameStateBookshops = [] } = useQuery<Bookshop[]>({
    queryKey: [`/api/bookstores/filter?state=${currentBookshop.state}`],
    enabled: !!currentBookshop.state,
  });

  // Fetch bookshops in the same city
  const { data: sameCityBookshops = [] } = useQuery<Bookshop[]>({
    queryKey: [`/api/bookstores/filter?city=${currentBookshop.city}`],
    enabled: !!currentBookshop.city,
  });

  // Fetch bookshops with similar features (if currentBookshop has feature IDs)
  const { data: similarFeatureBookshops = [] } = useQuery<Bookshop[]>({
    queryKey: [
      `/api/bookstores/filter?features=${currentBookshop.featureIds?.join(',')}`,
    ],
    enabled: !!currentBookshop.featureIds && currentBookshop.featureIds.length > 0,
  });

  // Filter out the current bookshop from the lists
  const filteredStateBookshops = sameStateBookshops
    .filter(bookshop => bookshop.id !== currentBookshop.id)
    .slice(0, 3); // Limit to 3 bookshops

  const filteredCityBookshops = sameCityBookshops
    .filter(bookshop => bookshop.id !== currentBookshop.id)
    .slice(0, 3); // Limit to 3 bookshops

  const filteredFeatureBookshops = similarFeatureBookshops
    .filter(bookshop => bookshop.id !== currentBookshop.id)
    .slice(0, 3); // Limit to 3 bookshops

  // Helper function to render a bookshop card
  const renderBookshopCard = (bookshop: Bookshop) => (
    <Link key={bookshop.id} href={`/bookshop/${bookshop.id}`}>
      <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        <div className="h-32 bg-gray-200 flex items-center justify-center">
          {bookshop.imageUrl ? (
            <img
              src={bookshop.imageUrl}
              alt={bookshop.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <BookshopIcon size={80} />
          )}
        </div>
        <div className="p-4">
          <h4 className="font-serif font-bold text-sm truncate text-[#5F4B32]">
            {bookshop.name}
          </h4>
          <p className="text-xs text-gray-600 truncate">
            {bookshop.city}, {bookshop.state}
          </p>
        </div>
      </div>
    </Link>
  );

  // Only render the component if there are related bookshops
  if (
    filteredStateBookshops.length === 0 &&
    filteredCityBookshops.length === 0 &&
    filteredFeatureBookshops.length === 0
  ) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h3 className="font-serif font-bold text-xl mb-6">Explore More Bookshops</h3>

      {filteredCityBookshops.length > 0 && (
        <div className="mb-6">
          <h4 className="font-semibold text-[#2A6B7C] mb-2">
            More in {currentBookshop.city}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {filteredCityBookshops.map(renderBookshopCard)}
          </div>
          {filteredCityBookshops.length === 3 && (
            <div className="mt-3 text-right">
              <Link href={`/directory/city/${currentBookshop.city}`}>
                <span className="text-sm text-[#2A6B7C] hover:text-[#E16D3D] font-medium">
                  View all in {currentBookshop.city} →
                </span>
              </Link>
            </div>
          )}
        </div>
      )}

      {filteredStateBookshops.length > 0 && (
        <div className="mb-6">
          <h4 className="font-semibold text-[#2A6B7C] mb-2">
            More in {currentBookshop.state}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {filteredStateBookshops.map(renderBookshopCard)}
          </div>
          {filteredStateBookshops.length === 3 && (
            <div className="mt-3 text-right">
              <Link href={`/directory/state/${currentBookshop.state}`}>
                <span className="text-sm text-[#2A6B7C] hover:text-[#E16D3D] font-medium">
                  View all in {currentBookshop.state} →
                </span>
              </Link>
            </div>
          )}
        </div>
      )}

      {filteredFeatureBookshops.length > 0 && (
        <div>
          <h4 className="font-semibold text-[#2A6B7C] mb-2">Similar Bookshops</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {filteredFeatureBookshops.map(renderBookshopCard)}
          </div>
          <div className="mt-3 text-right">
            <Link href="/directory">
              <span className="text-sm text-[#2A6B7C] hover:text-[#E16D3D] font-medium">
                Explore all bookshops →
              </span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default RelatedBookshops;