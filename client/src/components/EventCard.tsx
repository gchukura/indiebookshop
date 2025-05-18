import { Event } from "@shared/schema";
import { format } from "date-fns";
import { Calendar, Clock, MapPin } from "lucide-react";

interface EventCardProps {
  event: Event;
}

const EventCard = ({ event }: EventCardProps) => {
  // Format the date (assuming event.date is in ISO format or timestamp)
  const formatEventDate = (dateString: string | Date) => {
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      return format(date, 'MMMM d, yyyy');
    } catch (e) {
      return String(dateString);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4">
        <h4 className="text-lg font-serif font-bold text-[#5F4B32] mb-2 line-clamp-2">
          {event.title}
        </h4>
        
        <div className="flex items-start text-sm text-gray-600 mb-2">
          <Calendar className="h-4 w-4 mr-1 flex-shrink-0 mt-0.5 text-[#E16D3D]" />
          <span>{formatEventDate(event.date)}</span>
        </div>
        
        {event.time && (
          <div className="flex items-start text-sm text-gray-600 mb-2">
            <Clock className="h-4 w-4 mr-1 flex-shrink-0 mt-0.5 text-[#E16D3D]" />
            <span>{event.time}</span>
          </div>
        )}
        
        <div className="flex items-start text-sm text-gray-600 mb-3">
          <MapPin className="h-4 w-4 mr-1 flex-shrink-0 mt-0.5 text-[#E16D3D]" />
          <span>At the bookshop</span>
        </div>
        
        {event.description && (
          <p className="text-sm text-gray-700 line-clamp-3">
            {event.description}
          </p>
        )}
      </div>
    </div>
  );
};

export default EventCard;