import React, { useState } from "react";
import { format, isSameDay, isSameMonth, addMonths, subMonths, parseISO } from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { Link } from "wouter";
import { Event, Bookstore as Bookshop } from "@shared/schema";
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
  
  // Fetch all bookshops to display bookshop name with each event
  const { data: bookshops = [], isLoading: bookshopsLoading } = useQuery<Bookshop[]>({
    queryKey: ["/api/bookstores"],
  });
  
  // Get bookshop details by ID
  const getBookshopName = (bookshopId: number) => {
    const bookshop = bookshops.find(b => b.id === bookshopId);
    return bookshop?.name || "Unknown Bookshop";
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
    const bookshopName = getBookshopName(event.bookshopId);
    
    return (
      <Card className="mb-4 p-4 hover:shadow-md transition-shadow">
        <div className="flex flex-col">
          <h3 className="text-lg font-semibold text-[#5F4B32]">{event.title}</h3>
          <p className="text-sm text-gray-500 mb-2">
            {format(parseISO(event.date), 'MMMM d, yyyy')} • {event.time} • 
            <Link href={`/bookshop/${event.bookshopId}`} className="ml-1 text-[#2A6B7C] hover:underline">
              {bookshopName}
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
          Bookshop Events
        </h1>
        <p className="text-gray-600 mb-6">
          Discover readings, signings, book clubs, and other events at independent bookshops.
        </p>
      </div>

      {eventsLoading || bookshopsLoading ? (
        <div className="text-center py-12">
          <p>Loading events calendar...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <Button 
                    variant="ghost" 
                    onClick={goToPreviousMonth}
                    className="mr-2"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <h2 className="text-3xl font-serif text-[#5F4B32] font-bold">
                    {format(currentDate, 'MMMM yyyy')}
                  </h2>
                  <Button 
                    variant="ghost" 
                    onClick={goToNextMonth}
                    className="ml-2"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                </div>
              </div>
              
              {/* Custom calendar implementation */}
              <div className="w-full overflow-hidden rounded-md border">
                {/* Day names header */}
                <div className="grid grid-cols-7 bg-muted text-center">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="p-3 text-base font-semibold text-gray-700">
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Calendar grid */}
                <div className="grid grid-cols-7">
                  {(() => {
                    // Get the first day of the month
                    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
                    // Get the day of the week (0-6) on which the month begins
                    const startingDayOfWeek = firstDayOfMonth.getDay();
                    // Get the number of days in the month
                    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                    
                    // Create the days array
                    const daysArray = [];
                    
                    // Add empty cells for days of the previous month
                    for (let i = 0; i < startingDayOfWeek; i++) {
                      daysArray.push(
                        <div key={`empty-${i}`} className="h-20 p-2 border-t border-r text-gray-300" />
                      );
                    }
                    
                    // Add cells for days of the current month
                    for (let day = 1; day <= daysInMonth; day++) {
                      const date = new Date(currentYear, currentMonth, day);
                      const isSelected = selectedDate && isSameDay(date, selectedDate);
                      const hasEvent = datesWithEvents.some(eventDate => isSameDay(eventDate, date));
                      
                      daysArray.push(
                        <div 
                          key={`day-${day}`}
                          onClick={() => setSelectedDate(date)}
                          className={`h-20 p-2 border-t border-r relative cursor-pointer hover:bg-gray-50 ${
                            isSelected ? 'bg-blue-50' : ''
                          }`}
                        >
                          <span className="text-lg">{day}</span>
                          {hasEvent && (
                            <div className="absolute bottom-2 left-1/2 w-3 h-3 bg-[#E16D3D] rounded-full transform -translate-x-1/2" />
                          )}
                        </div>
                      );
                    }
                    
                    // Calculate how many rows we need (minimum 5 to display a full month)
                    const daysUsed = startingDayOfWeek + daysInMonth;
                    const rowsNeeded = Math.ceil(daysUsed / 7);
                    const totalCells = rowsNeeded * 7;
                    const remainingCells = totalCells - daysArray.length;
                    
                    for (let i = 0; i < remainingCells; i++) {
                      daysArray.push(
                        <div key={`empty-end-${i}`} className="h-20 p-2 border-t border-r text-gray-300" />
                      );
                    }
                    
                    return daysArray;
                  })()}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
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
              Are you an independent bookshop owner or employee? You can submit your upcoming events to be featured in our calendar.
            </p>
            <Link href="/submit-event">
              <Button className="bg-[#4A7C59] hover:bg-[#4A7C59]/90 text-white">
                Add an Event
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Events;