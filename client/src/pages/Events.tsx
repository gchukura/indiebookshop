import React, { useState } from "react";
import { format, isSameDay, isSameMonth, addMonths, subMonths, parseISO } from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { Link } from "wouter";
import { Event, Bookstore } from "@shared/schema";
import { useCalendarEvents } from "@/hooks/useEvents";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

const Events = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  // Get current month and year
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  // Fetch events for the current month
  const { data: events = [], isLoading: eventsLoading } = useCalendarEvents(currentYear, currentMonth);
  
  // Fetch all bookstores to display bookstore name with each event
  const { data: bookstores = [], isLoading: bookstoresLoading } = useQuery<Bookstore[]>({
    queryKey: ["/api/bookstores"],
  });
  
  // Get bookstore details by ID
  const getBookstoreName = (bookstoreId: number) => {
    const bookstore = bookstores.find(b => b.id === bookstoreId);
    return bookstore?.name || "Unknown Bookstore";
  };
  
  // Navigate to previous month
  const goToPreviousMonth = () => {
    setCurrentDate(prevDate => subMonths(prevDate, 1));
  };
  
  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentDate(prevDate => addMonths(prevDate, 1));
  };
  
  // Filter events for the selected date
  const eventsOnSelectedDate = selectedDate 
    ? events.filter(event => {
        try {
          const eventDate = parseISO(event.date);
          return isSameDay(eventDate, selectedDate);
        } catch (e) {
          console.error(`Error parsing date for event ${event.id}:`, e);
          return false;
        }
      })
    : [];
  
  // Mark dates with events on the calendar
  const datesWithEvents = events.reduce((acc: Date[], event) => {
    try {
      const eventDate = parseISO(event.date);
      acc.push(eventDate);
      return acc;
    } catch (e) {
      console.error(`Error parsing date for event:`, e);
      return acc;
    }
  }, []);

  // Event card component
  const EventCard = ({ event }: { event: Event }) => {
    const bookstoreName = getBookstoreName(event.bookstoreId);
    
    return (
      <Card className="mb-4 p-4 hover:shadow-md transition-shadow">
        <div className="flex flex-col">
          <h3 className="text-lg font-semibold text-[#5F4B32]">{event.title}</h3>
          <p className="text-sm text-gray-500 mb-2">
            {format(parseISO(event.date), 'MMMM d, yyyy')} • {event.time} • 
            <Link href={`/bookstore/${event.bookstoreId}`} className="ml-1 text-[#2A6B7C] hover:underline">
              {bookstoreName}
            </Link>
          </p>
          <p className="text-gray-700">{event.description}</p>
        </div>
      </Card>
    );
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-[#5F4B32] mb-4">
          Bookstore Events
        </h1>
        <p className="text-gray-600 mb-6">
          Discover readings, signings, book clubs, and other events at independent bookstores.
        </p>
      </div>

      {eventsLoading || bookstoresLoading ? (
        <div className="text-center py-12">
          <p>Loading events calendar...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <Button 
                    variant="ghost" 
                    onClick={goToPreviousMonth}
                    className="mr-1"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <h2 className="text-2xl font-serif text-[#5F4B32] font-bold">
                    {format(currentDate, 'MMMM yyyy')}
                  </h2>
                  <Button 
                    variant="ghost" 
                    onClick={goToNextMonth}
                    className="ml-1"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                month={currentDate}
                className="rounded-md border w-full [&_.rdp-cell]:p-0 [&_.rdp-day]:h-14 [&_.rdp-day]:w-14 [&_.rdp-day]:text-lg"
                modifiers={{
                  eventDay: datesWithEvents
                }}
                modifiersClassNames={{
                  eventDay: "relative before:absolute before:bottom-2 before:left-1/2 before:w-2 before:h-2 before:bg-[#E16D3D] before:rounded-full before:-translate-x-1/2"
                }}
              />
            </div>
          </div>

          <div>
            <div className="bg-white rounded-lg shadow-sm p-6 h-full">
              <h2 className="text-xl font-serif font-bold text-[#5F4B32] mb-4">
                {selectedDate ? (
                  <>Events on {format(selectedDate, 'MMMM d, yyyy')}</>
                ) : (
                  <>Select a date to see events</>
                )}
              </h2>

              {eventsOnSelectedDate.length > 0 ? (
                <div className="space-y-4">
                  {eventsOnSelectedDate.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {selectedDate ? (
                    <p>No events scheduled for this date</p>
                  ) : (
                    <p>Click on a date to view events</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-12 bg-[#F7F3E8] rounded-lg p-6">
        <div className="flex items-start">
          <div className="mr-4 flex-shrink-0">
            <Info className="h-6 w-6 text-[#E16D3D]" />
          </div>
          <div>
            <h2 className="text-xl font-serif font-bold text-[#5F4B32] mb-2">
              Event Listings
            </h2>
            <p className="text-gray-700 mb-4">
              Are you an independent bookstore owner or employee? You can submit your upcoming events to be featured in our calendar.
            </p>
            <Link href="/submit-event">
              <Button className="bg-[#4A7C59] hover:bg-[#4A7C59]/90 text-white">
                Add Your Event
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Events;