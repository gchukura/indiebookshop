import React from 'react';
import { Event } from '@shared/schema';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface EventCardProps {
  event: Event;
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
  return (
    <Card className="mb-4 hover:shadow-md transition-shadow duration-200">
      <CardHeader>
        <CardTitle className="text-lg">{event.title}</CardTitle>
        <CardDescription>
          <div className="flex items-center text-sm">
            <Calendar className="h-4 w-4 mr-1" />
            {formatDate(event.date)}
            {event.time && (
              <>
                <Clock className="h-4 w-4 ml-2 mr-1" />
                {event.time}
              </>
            )}
          </div>
          {event.location && (
            <div className="flex items-center text-sm mt-1">
              <MapPin className="h-4 w-4 mr-1" />
              {event.location}
            </div>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600">{event.description}</p>
      </CardContent>
      {event.registrationUrl && (
        <CardFooter>
          <Button variant="outline" className="w-full" asChild>
            <a href={event.registrationUrl} target="_blank" rel="noopener noreferrer">
              Register
            </a>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default EventCard;