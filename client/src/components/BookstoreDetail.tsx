import { useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bookstore, Feature, Event } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { X, MapPin, Heart, Share2, Flag, Navigation } from "lucide-react";

interface BookstoreDetailProps {
  bookstoreId: number;
  isOpen: boolean;
  onClose: () => void;
}

const BookstoreDetail = ({ bookstoreId, isOpen, onClose }: BookstoreDetailProps) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Fetch bookstore details
  const { data: bookstore, isLoading: isLoadingBookstore } = useQuery<Bookstore>({
    queryKey: [`/api/bookstores/${bookstoreId}`],
    enabled: isOpen && bookstoreId > 0,
  });

  // Fetch all features to match with bookstore.featureIds
  const { data: features } = useQuery<Feature[]>({
    queryKey: ["/api/features"],
    enabled: isOpen,
  });

  // Fetch events for this bookstore
  const { data: events } = useQuery<Event[]>({
    queryKey: [`/api/bookstores/${bookstoreId}/events`],
    enabled: isOpen && bookstoreId > 0,
  });

  // Handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Get feature names for the bookstore
  const bookstoreFeatures = features?.filter(feature => 
    bookstore?.featureIds.includes(feature.id)
  ) || [];

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div 
          ref={modalRef}
          className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl w-full"
        >
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button 
              type="button" 
              className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <X className="h-6 w-6" />
            </button>
          </div>
          
          {isLoadingBookstore ? (
            <div className="p-8 text-center">
              <p>Loading bookstore details...</p>
            </div>
          ) : !bookstore ? (
            <div className="p-8 text-center">
              <p>Could not load bookstore details. Please try again.</p>
            </div>
          ) : (
            <div className="bg-[#F7F3E8]">
              <div className="relative h-64 md:h-96">
                <img 
                  src={bookstore.imageUrl || "https://images.unsplash.com/photo-1507842217343-583bb7270b66?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=400"}
                  alt={`${bookstore.name} interior panorama`} 
                  className="w-full h-full object-cover" 
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                  <h2 className="text-white text-2xl md:text-3xl font-serif font-bold">{bookstore.name}</h2>
                  <p className="text-white/90 text-sm md:text-base">{bookstore.city}, {bookstore.state}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
                <div className="md:col-span-2">
                  <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h3 className="font-serif font-bold text-xl mb-4">About</h3>
                    <p className="mb-4">{bookstore.description}</p>
                    
                    <div className="mt-6">
                      <h3 className="font-serif font-bold text-xl mb-4">Features & Specialties</h3>
                      <div className="flex flex-wrap gap-2">
                        {bookstoreFeatures.map(feature => (
                          <span key={feature.id} className="store-feature-tag bg-[rgba(42,107,124,0.1)] text-[#2A6B7C] rounded-full px-3 py-1 text-xs font-semibold">
                            {feature.name}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <h3 className="font-serif font-bold text-xl mb-4">Photo Gallery</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {/* Gallery images would be loaded from API in a real implementation */}
                        <img src="https://pixabay.com/get/g19250fbdac2034d9a52598452a015110ca00e8a72f6f106864355fe192e17a2f7b06bb3391d499dc2b825b670440e97c837b67954aaaa898a198fa05df311386_1280.jpg" alt="Bookstore interior shelves" className="rounded-md h-28 w-full object-cover" />
                        <img src="https://images.unsplash.com/photo-1524578271613-d550eacf6090?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" alt="Book display with staff recommendations" className="rounded-md h-28 w-full object-cover" />
                        <img src="https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" alt="Reading area with comfortable seating" className="rounded-md h-28 w-full object-cover" />
                        <img src="https://pixabay.com/get/gad7ae5ca8d3c20e6ea7d3000b277b675a63c751be2dad2863a5d5f792c8694ae9eda1dd7a4da67c8050e92d6d9e65616ab0e5d77451a37f6824bd02c471550ed_1280.jpg" alt="Bookstore storefront" className="rounded-md h-28 w-full object-cover" />
                        <img src="https://pixabay.com/get/ge0dbb377908f4d4cf2abc1fb59b7bbebce8f79c3fc968b875fb589c86fa09193b24c436494cf183cb26093951597295d7e6f938ef23f48dbe21fdbb8e4ca8961_1280.jpg" alt="Café area with customers" className="rounded-md h-28 w-full object-cover" />
                        <img src="https://pixabay.com/get/g8bf46861013f9985b53e992bfae870fb41e446b54a69402db4a287ead0c05467b3e92ea76bd39bebfc06fdba42143d720a995d603858b2cd3c4f461b441a6802_1280.jpg" alt="Author event with audience" className="rounded-md h-28 w-full object-cover" />
                      </div>
                    </div>
                    
                    {events && events.length > 0 && (
                      <div className="mt-6">
                        <h3 className="font-serif font-bold text-xl mb-4">Upcoming Events</h3>
                        <div className="space-y-4">
                          {events.map(event => (
                            <div key={event.id} className="border-l-4 border-[#E16D3D] pl-4">
                              <p className="font-bold">{event.title}</p>
                              <p className="text-sm text-gray-600">{event.date} • {event.time}</p>
                              <p className="text-sm mt-1">{event.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="md:col-span-1">
                  <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h3 className="font-serif font-bold text-xl mb-4">Store Information</h3>
                    <div className="space-y-4">
                      <div>
                        <p className="font-bold">Address</p>
                        <p>{bookstore.street}</p>
                        <p>{bookstore.city}, {bookstore.state} {bookstore.zip}</p>
                      </div>
                      
                      <div>
                        <p className="font-bold">Contact</p>
                        <p>Phone: {bookstore.phone || 'Not available'}</p>
                        <p>Website: {bookstore.website ? (
                          <a href={bookstore.website} target="_blank" rel="noopener noreferrer" className="text-[#2A6B7C] hover:text-[#E16D3D]">
                            {new URL(bookstore.website).hostname}
                          </a>
                        ) : 'Not available'}</p>
                      </div>
                      
                      <div>
                        <p className="font-bold">Hours</p>
                        {bookstore.hours ? (
                          <div className="grid grid-cols-2 gap-1 text-sm">
                            {Object.entries(bookstore.hours).map(([day, hours]) => (
                              <React.Fragment key={day}>
                                <p>{day}:</p>
                                <p>{hours}</p>
                              </React.Fragment>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm">Hours not available</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h3 className="font-serif font-bold text-xl mb-4">Store Location</h3>
                    <div className="bg-gray-200 h-52 rounded-md overflow-hidden">
                      {bookstore.latitude && bookstore.longitude ? (
                        <iframe
                          width="100%"
                          height="100%"
                          frameBorder="0"
                          style={{ border: 0 }}
                          src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBNLrJhOMz6idD05pzwk17mcUoQcCyJbfc&q=${bookstore.latitude},${bookstore.longitude}`}
                          allowFullScreen
                        ></iframe>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center p-4">
                            <MapPin className="h-10 w-10 text-[#2A6B7C] mx-auto mb-2" />
                            <p className="text-sm">Location data not available</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-4">
                      <Button className="w-full bg-[#2A6B7C] hover:bg-[#2A6B7C]/90 text-white py-2 rounded-md font-medium">
                        <Navigation className="h-4 w-4 mr-2" /> Get Directions
                      </Button>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <h3 className="font-serif font-bold text-xl mb-4">Actions</h3>
                    <div className="space-y-3">
                      <Button variant="outline" className="w-full border border-gray-300 hover:bg-gray-50 text-dark py-2 rounded-md font-medium">
                        <Heart className="h-4 w-4 mr-2" /> Save to Favorites
                      </Button>
                      <Button variant="outline" className="w-full border border-gray-300 hover:bg-gray-50 text-dark py-2 rounded-md font-medium">
                        <Share2 className="h-4 w-4 mr-2" /> Share
                      </Button>
                      <Button variant="outline" className="w-full border border-gray-300 hover:bg-gray-50 text-dark py-2 rounded-md font-medium">
                        <Flag className="h-4 w-4 mr-2" /> Report Issue
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookstoreDetail;
