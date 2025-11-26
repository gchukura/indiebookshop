import React, { useState, useMemo, useEffect } from "react";
import { format, isSameDay, parseISO } from "date-fns";
import { Calendar as CalendarIcon, Clock, MapPin, ChevronDown, Info } from "lucide-react";
import { Link } from "wouter";
import { Event, Bookstore as Bookshop } from "@shared/schema";
import { useCalendarEvents } from "@/hooks/useEvents";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SEO } from "../components/SEO";
import { BASE_URL, PAGE_KEYWORDS, DESCRIPTION_TEMPLATES } from "../lib/seo";
import { generateSlugFromName } from "../lib/linkUtils";
import { logger } from "@/lib/logger";

const Events = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  
  // Get current month and year
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  // Fetch events for the current month
  const { data: events = [], isLoading: eventsLoading, isError: eventsError, error: eventsErrorObj } = useCalendarEvents(currentYear, currentMonth);
  
  // Log errors when they occur
  useEffect(() => {
    if (eventsError && eventsErrorObj) {
      logger.error('Failed to fetch calendar events', eventsErrorObj, {
        year: currentYear,
        month: currentMonth,
        page: 'Events'
      });
    }
  }, [eventsError, eventsErrorObj, currentYear, currentMonth]);
  
  // Fetch all bookshops to display bookshop name with each event
  const { data: bookshops = [], isLoading: bookshopsLoading, isError: bookshopsError, error: bookshopsErrorObj } = useQuery<Bookshop[]>({
    queryKey: ["/api/bookstores"],
  });
  
  // Log errors when they occur
  useEffect(() => {
    if (bookshopsError && bookshopsErrorObj) {
      logger.error('Failed to fetch bookshops for Events page', bookshopsErrorObj, {
        page: 'Events'
      });
    }
  }, [bookshopsError, bookshopsErrorObj]);
  
  // Get bookshop details by ID
  const getBookshop = (bookshopId: number) => {
    return bookshops.find(b => b.id === bookshopId);
  };
  
  // Event type badge configuration
  const eventTypeBadges = {
    'author-reading': { label: 'Author Reading', color: 'bg-blue-100 text-blue-800' },
    'book-signing': { label: 'Book Signing', color: 'bg-purple-100 text-purple-800' },
    'book-club': { label: 'Book Club', color: 'bg-green-100 text-green-800' },
    'workshop': { label: 'Workshop', color: 'bg-orange-100 text-orange-800' },
    'storytime': { label: 'Story Time', color: 'bg-pink-100 text-pink-800' },
    'poetry': { label: 'Poetry Reading', color: 'bg-indigo-100 text-indigo-800' },
    'festival': { label: 'Literary Festival', color: 'bg-red-100 text-red-800' },
  };
  
  // Filter events based on selected filters
  const filteredEvents = useMemo(() => {
    let filtered = [...events];
    
    // Filter by location
    if (locationFilter !== "all") {
      filtered = filtered.filter(event => {
        const bookshop = getBookshop(event.bookshopId);
        return bookshop?.state === locationFilter;
      });
    }
    
    // Filter by event type
    if (eventTypeFilter !== "all") {
      filtered = filtered.filter(event => {
        const eventType = (event as any).type || 'author-reading';
        return eventType === eventTypeFilter;
      });
    }
    
    // Sort by date
    filtered.sort((a, b) => {
      try {
        const dateA = parseISO(a.date);
        const dateB = parseISO(b.date);
        if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
          throw new Error(`Invalid date format: ${a.date} or ${b.date}`);
        }
        return dateA.getTime() - dateB.getTime();
      } catch (e) {
        logger.error('Error parsing event date for sorting', e, { 
          eventA: { id: a.id, date: a.date },
          eventB: { id: b.id, date: b.date }
        });
        return 0;
      }
    });
    
    return filtered;
  }, [events, locationFilter, eventTypeFilter, bookshops]);
  
  // Get unique states from events for filter dropdown
  const availableStates = useMemo(() => {
    const states = new Set<string>();
    events.forEach(event => {
      const bookshop = getBookshop(event.bookshopId);
      if (bookshop?.state) {
        states.add(bookshop.state);
      }
    });
    return Array.from(states).sort();
  }, [events, bookshops]);

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
  
  // Enhanced event card component with visual hierarchy
  const EventCard = ({ event }: { event: Event }) => {
    const bookshop = getBookshop(event.bookshopId);
    const bookshopSlug = bookshop ? generateSlugFromName(bookshop.name) : "";
    
    let eventDate: Date;
    try {
      eventDate = parseISO(event.date);
      if (isNaN(eventDate.getTime())) {
        throw new Error(`Invalid date: ${event.date}`);
      }
    } catch (e) {
      logger.error('Error parsing event date in EventCard', e, {
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.date
      });
      // Fallback to current date to prevent crash
      eventDate = new Date();
    }
    
    const eventType = (event as any).type || 'author-reading';
    const badge = eventTypeBadges[eventType as keyof typeof eventTypeBadges] || eventTypeBadges['author-reading'];
    
    return (
      <Card className="overflow-hidden hover:shadow-xl transition-shadow mb-4">
        <div className="p-4 md:p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              {/* Event type badge */}
              <span className={`inline-block px-2 py-1 text-xs font-medium rounded mb-2 ${badge.color}`}>
                {badge.label}
              </span>
              
              <h3 className="font-serif font-bold text-base md:text-lg lg:text-xl text-[#5F4B32] mb-1 break-words">
                {event.title}
              </h3>
            </div>
            
            {/* Date badge on right */}
            <div className="text-right ml-4 flex-shrink-0">
              <div className="text-2xl font-serif font-bold text-[#E16D3D]">
                {format(eventDate, 'd')}
              </div>
              <div className="text-xs md:text-sm text-gray-600 uppercase font-sans">
                {format(eventDate, 'MMM')}
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center text-xs md:text-sm text-gray-600 mb-3 gap-x-4 gap-y-2">
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1 flex-shrink-0" />
              <span>{event.time}</span>
            </div>
            
            {bookshop && (
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                <Link to={`/bookshop/${bookshopSlug}`} className="text-[#2A6B7C] hover:underline">
                  {bookshop.name}
                </Link>
              </div>
            )}
          </div>
          
          {event.description && (
            <p className="font-sans text-sm md:text-base text-gray-700 line-clamp-3">
              {event.description}
            </p>
          )}
        </div>
      </Card>
    );
  };

  return (
    <>
      {/* SEO Component */}
      <SEO 
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        canonicalUrl={canonicalUrl}
      />
      
      {/* Hero Section - Style Guide Compliant */}
      <section className="py-10 md:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#F7F3E8] rounded-lg p-6 md:p-8">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-[#5F4B32] mb-6 text-center">
                Literary Events at Independent Bookshops
              </h1>
              <p className="font-sans text-base md:text-body-lg text-gray-700 text-center">
                Find author readings, book clubs, and special events at indie bookshops near you. 
                Discover the literary experiences that make local bookstores vital community spaces.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {eventsLoading || bookshopsLoading ? (
            <div className="text-center py-10">
              <p className="font-sans text-base text-gray-700">Loading events...</p>
            </div>
          ) : (
            <>
              {/* Filter Bar */}
              <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-8 max-w-4xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Location filter */}
                  <div>
                    <label className="font-sans text-sm font-medium text-gray-700 mb-2 block">
                      Location
                    </label>
                    <div className="relative">
                      <select 
                        className="w-full border border-gray-200 rounded-md p-2 pr-8 appearance-none bg-white font-sans text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-[#2A6B7C] focus:border-transparent"
                        value={locationFilter}
                        onChange={(e) => setLocationFilter(e.target.value)}
                      >
                        <option value="all">All locations</option>
                        {availableStates.map(state => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  
                  {/* Event type filter */}
                  <div>
                    <label className="font-sans text-sm font-medium text-gray-700 mb-2 block">
                      Event Type
                    </label>
                    <div className="relative">
                      <select 
                        className="w-full border border-gray-200 rounded-md p-2 pr-8 appearance-none bg-white font-sans text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-[#2A6B7C] focus:border-transparent"
                        value={eventTypeFilter}
                        onChange={(e) => setEventTypeFilter(e.target.value)}
                      >
                        <option value="all">All types</option>
                        <option value="author-reading">Author Readings</option>
                        <option value="book-signing">Book Signings</option>
                        <option value="book-club">Book Clubs</option>
                        <option value="workshop">Workshops</option>
                        <option value="storytime">Story Time</option>
                        <option value="poetry">Poetry Readings</option>
                        <option value="festival">Literary Festivals</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  
                  {/* Date range - placeholder for future enhancement */}
                  <div>
                    <label className="font-sans text-sm font-medium text-gray-700 mb-2 block">
                      When
                    </label>
                    <div className="relative">
                      <select 
                        className="w-full border border-gray-200 rounded-md p-2 pr-8 appearance-none bg-white font-sans text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-[#2A6B7C] focus:border-transparent"
                        defaultValue="upcoming"
                      >
                        <option value="upcoming">Upcoming</option>
                        <option value="this-week">This Week</option>
                        <option value="this-month">This Month</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
                
                {/* Active filters indicator */}
                {(locationFilter !== "all" || eventTypeFilter !== "all") && (
                  <div className="mt-4 flex items-center gap-2 text-sm">
                    <span className="font-sans text-gray-600">Active filters:</span>
                    {locationFilter !== "all" && (
                      <span className="px-2 py-1 bg-[#2A6B7C] text-white rounded-full text-xs font-sans font-semibold">
                        {locationFilter}
                      </span>
                    )}
                    {eventTypeFilter !== "all" && (
                      <span className="px-2 py-1 bg-[#2A6B7C] text-white rounded-full text-xs font-sans font-semibold">
                        {eventTypeBadges[eventTypeFilter as keyof typeof eventTypeBadges]?.label}
                      </span>
                    )}
                    <button 
                      onClick={() => {
                        setLocationFilter("all");
                        setEventTypeFilter("all");
                      }}
                      className="font-sans text-[#2A6B7C] hover:underline text-xs ml-2"
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </div>

              {/* Events List */}
              <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-serif text-2xl md:text-3xl font-bold text-[#5F4B32]">
                      Upcoming Events
                      {filteredEvents.length > 0 && (
                        <span className="font-sans text-lg font-normal text-gray-600 ml-2">
                          ({filteredEvents.length})
                        </span>
                      )}
                    </h2>
                  </div>

                  {filteredEvents.length > 0 ? (
                    <div>
                      {filteredEvents.map((event) => (
                        <EventCard key={event.id} event={event} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-200">
                      <CalendarIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                      <h3 className="font-serif text-xl font-bold text-gray-700 mb-2">
                        No events found
                      </h3>
                      <p className="font-sans text-gray-600 mb-4 max-w-md mx-auto">
                        {locationFilter !== "all" || eventTypeFilter !== "all" 
                          ? "Try adjusting your filters to see more events."
                          : "We're growing our events calendar with help from bookshops across America."}
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        {(locationFilter !== "all" || eventTypeFilter !== "all") && (
                          <Button 
                            variant="outline"
                            onClick={() => {
                              setLocationFilter("all");
                              setEventTypeFilter("all");
                            }}
                            className="rounded-full"
                          >
                            Clear Filters
                          </Button>
                        )}
                        <Link href="/submit-event">
                          <Button className="bg-[#E16D3D] hover:bg-[#d06a4f] text-white rounded-full px-8 py-4 min-h-[56px] font-semibold">
                            Add an Event
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
      
      {/* Event Submission CTA - Only show when there are events */}
      {filteredEvents.length > 0 && (
        <section className="py-8 md:py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-[#F7F3E8] rounded-lg p-6 md:p-8 max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row items-start">
                <div className="mr-4 flex-shrink-0 mb-4 md:mb-0">
                  <Info className="h-6 w-6 text-[#E16D3D]" />
                </div>
                <div className="flex-1">
                  <h2 className="font-serif text-xl md:text-2xl font-bold text-[#5F4B32] mb-2">
                    Submit Your Bookshop Event
                  </h2>
                  <p className="font-sans text-sm md:text-base text-gray-700 mb-4">
                    Independent bookshop hosting an author reading, book signing, or literary event? 
                    Add it to our calendar and reach readers across America.
                  </p>
                  <Link href="/submit-event">
                    <Button className="bg-[#2A6B7C] hover:bg-[#1d5a6a] text-white rounded-full px-8 py-4 min-h-[56px] font-semibold">
                      Add an Event
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
      
      {/* Helpful Tips Section - Replaces Generic SEO Content */}
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg p-6 md:p-8 border border-gray-200 max-w-4xl mx-auto">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-[#5F4B32] mb-6 text-center">
              How to Make the Most of Bookshop Events
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-serif font-bold text-lg text-[#5F4B32] mb-3">
                  For Readers
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <span className="text-[#E16D3D] mr-2 font-sans">•</span>
                    <span className="font-sans text-sm md:text-base text-gray-700">Arrive early for popular author signings</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-[#E16D3D] mr-2 font-sans">•</span>
                    <span className="font-sans text-sm md:text-base text-gray-700">Support bookshops by purchasing books at the event</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-[#E16D3D] mr-2 font-sans">•</span>
                    <span className="font-sans text-sm md:text-base text-gray-700">Check if registration or tickets are required</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-[#E16D3D] mr-2 font-sans">•</span>
                    <span className="font-sans text-sm md:text-base text-gray-700">Follow your favorite bookshops for event updates</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-[#E16D3D] mr-2 font-sans">•</span>
                    <span className="font-sans text-sm md:text-base text-gray-700">Bring cash for books and refreshments</span>
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-serif font-bold text-lg text-[#5F4B32] mb-3">
                  For Bookshops
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <span className="text-[#E16D3D] mr-2 font-sans">•</span>
                    <span className="font-sans text-sm md:text-base text-gray-700">Submit events at least 2 weeks in advance</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-[#E16D3D] mr-2 font-sans">•</span>
                    <span className="font-sans text-sm md:text-base text-gray-700">Include author and book details when applicable</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-[#E16D3D] mr-2 font-sans">•</span>
                    <span className="font-sans text-sm md:text-base text-gray-700">Specify if registration or tickets are required</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-[#E16D3D] mr-2 font-sans">•</span>
                    <span className="font-sans text-sm md:text-base text-gray-700">Update or cancel events promptly if plans change</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-[#E16D3D] mr-2 font-sans">•</span>
                    <span className="font-sans text-sm md:text-base text-gray-700">Add contact information for event questions</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Events;
