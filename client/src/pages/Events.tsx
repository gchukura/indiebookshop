import React, { useState, useMemo } from "react";
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
import { SEO } from "../components/SEO";
import { BASE_URL, PAGE_KEYWORDS, DESCRIPTION_TEMPLATES } from "../lib/seo";
import { generateSlugFromName } from "../lib/linkUtils";

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
  
  // Get bookshop slug by ID
  const getBookshopSlug = (bookshopId: number) => {
    const bookshop = bookshops.find(b => b.id === bookshopId);
    if (!bookshop) return "";
    return generateSlugFromName(bookshop.name);
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

  // SEO metadata for events page
  const seoTitle = useMemo(() => {
    return "Bookshop Events Calendar | Literary Events at Independent Bookshops";
  }, []);
  
  const seoDescription = useMemo(() => {
    return DESCRIPTION_TEMPLATES.events;
  }, []);
  
  const seoKeywords = useMemo(() => {
    return [
      "bookshop events",
      "indie bookstore events",
      "literary events",
      "author readings",
      "book signings",
      "book clubs",
      "bookstore calendar",
      "independent bookshop events",
      "local literary events",
      "author meet and greets",
      "poetry readings",
      "book launch events",
      "children's story time",
      "literary festivals",
      "bookshop workshops",
      ...PAGE_KEYWORDS.events.additionalKeywords
    ];
  }, []);
  
  const canonicalUrl = useMemo(() => {
    return `${BASE_URL}/events`;
  }, []);
  
  // Event card component
  const EventCard = ({ event }: { event: Event }) => {
    const bookshopName = getBookshopName(event.bookshopId);
    const bookshopSlug = getBookshopSlug(event.bookshopId);
    
    return (
      <Card className="mb-4 p-4 hover:shadow-md transition-shadow">
        <div className="flex flex-col">
          <h3 className="text-lg font-semibold text-[#5F4B32]">{event.title}</h3>
          <p className="text-sm text-gray-500 mb-2">
            {format(parseISO(event.date), 'MMMM d, yyyy')} • {event.time} • 
            <Link href={`/bookshop/${bookshopSlug}`} className="ml-1 text-[#2A6B7C] hover:underline">
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
      {/* SEO Component */}
      <SEO 
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        canonicalUrl={canonicalUrl}
      />
      
      <div className="max-w-3xl mx-auto mb-12">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif font-bold text-[#5F4B32] mb-4">
          Independent Bookshop Events Calendar
        </h1>
        <p className="text-lg md:text-xl text-gray-600 mb-6">
          Discover author readings, book signings, literary festivals, book clubs, children's story times, and 
          other special events at independent bookshops across America. Our comprehensive events calendar 
          helps you connect with your local literary community.
        </p>
      </div>

      {eventsLoading || bookshopsLoading ? (
        <div className="text-center py-10">
          <p className="text-base">Loading events calendar...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
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
                  <h2 className="text-2xl md:text-3xl font-serif text-[#5F4B32] font-bold">
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
      
      {/* Event Submission Section */}
      <div className="mt-12 bg-[#F7F3E8] rounded-lg p-6">
        <div className="flex flex-col md:flex-row items-start">
          <div className="mr-4 flex-shrink-0 mb-4 md:mb-0">
            <Info className="h-6 w-6 text-[#E16D3D]" />
          </div>
          <div>
            <h2 className="text-xl font-serif font-bold text-[#5F4B32] mb-2">
              Submit Your Bookshop Event
            </h2>
            <p className="text-gray-700 mb-4">
              Are you an independent bookshop owner or employee? You can submit your upcoming author readings, book signings, 
              literary festivals, book clubs, and other special events to be featured in our comprehensive calendar.
            </p>
            <Link href="/submit-event">
              <Button className="bg-[#4A7C59] hover:bg-[#4A7C59]/90 text-white">
                Add an Event
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      {/* SEO Content Section */}
      <section className="mt-12 bg-white rounded-lg p-6 border border-[#E3E9ED]">
        <h2 className="text-2xl font-serif font-bold text-[#5F4B32] mb-4">
          About Our Independent Bookshop Events Calendar
        </h2>
        <div className="prose prose-p:text-gray-700 max-w-none">
          <p>
            Our independent bookshop events calendar showcases literary events happening at indie bookstores across America. 
            From author readings and book signings to writing workshops and children's story times, these events create vibrant 
            spaces for literary communities to connect and thrive.
          </p>
          <p>
            Independent bookshops are more than just places to buy books—they're cultural hubs that foster community connections 
            through diverse programming. By attending events at local indie bookshops, you support small businesses while enjoying 
            unique literary experiences that online retailers simply can't provide.
          </p>
          <p>
            Browse our calendar to discover upcoming events by date or explore events at specific bookshops. Whether you're looking 
            for poetry readings, book clubs, or author meet and greets, our comprehensive events directory connects book lovers with 
            meaningful literary experiences at independent bookstores nationwide.
          </p>
        </div>
      </section>
    </div>
  );
};

export default Events;