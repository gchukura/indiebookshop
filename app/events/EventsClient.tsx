'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, Clock, MapPin, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { Event, Bookstore as Bookshop } from '@/shared/schema';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { generateSlugFromName } from '@/shared/utils';

// This will need to be implemented or imported from the old client
// For now, creating a placeholder
function useCalendarEvents(year: number, month: number) {
  return useQuery<Event[]>({
    queryKey: [`/api/events`, year, month],
    queryFn: async () => {
      const response = await fetch(`/api/events?year=${year}&month=${month}`);
      if (!response.ok) throw new Error('Failed to fetch events');
      return response.json();
    },
  });
}

export function EventsClient() {
  const [currentDate] = useState(new Date());
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  const { data: events = [], isLoading: eventsLoading } = useCalendarEvents(currentYear, currentMonth);
  
  const { data: bookshops = [], isLoading: bookshopsLoading } = useQuery<Bookshop[]>({
    queryKey: ['/api/bookstores'],
    queryFn: async () => {
      const response = await fetch('/api/bookstores');
      if (!response.ok) throw new Error('Failed to fetch bookshops');
      return response.json();
    },
  });
  
  const getBookshop = (bookshopId: number) => {
    return bookshops.find(b => b.id === bookshopId);
  };
  
  const eventTypeBadges = {
    'author-reading': { label: 'Author Reading', color: 'bg-blue-100 text-blue-800' },
    'book-signing': { label: 'Book Signing', color: 'bg-purple-100 text-purple-800' },
    'book-club': { label: 'Book Club', color: 'bg-green-100 text-green-800' },
    'workshop': { label: 'Workshop', color: 'bg-orange-100 text-orange-800' },
    'storytime': { label: 'Story Time', color: 'bg-pink-100 text-pink-800' },
    'poetry': { label: 'Poetry Reading', color: 'bg-indigo-100 text-indigo-800' },
    'festival': { label: 'Literary Festival', color: 'bg-red-100 text-red-800' },
  };
  
  const filteredEvents = useMemo(() => {
    let filtered = [...events];
    
    if (locationFilter !== 'all') {
      filtered = filtered.filter(event => {
        const bookshop = getBookshop(event.bookshopId);
        return bookshop?.state === locationFilter;
      });
    }
    
    if (eventTypeFilter !== 'all') {
      filtered = filtered.filter(event => {
        const eventType = (event as any).type || 'author-reading';
        return eventType === eventTypeFilter;
      });
    }
    
    filtered.sort((a, b) => {
      try {
        const dateA = parseISO(a.date);
        const dateB = parseISO(b.date);
        return dateA.getTime() - dateB.getTime();
      } catch {
        return 0;
      }
    });
    
    return filtered;
  }, [events, locationFilter, eventTypeFilter, bookshops]);
  
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

  const EventCard = ({ event }: { event: Event }) => {
    const bookshop = getBookshop(event.bookshopId);
    const bookshopSlug = bookshop ? (bookshop.slug || generateSlugFromName(bookshop.name)) : '';
    
    let eventDate: Date;
    try {
      eventDate = parseISO(event.date);
      if (isNaN(eventDate.getTime())) {
        eventDate = new Date();
      }
    } catch {
      eventDate = new Date();
    }
    
    const eventType = (event as any).type || 'author-reading';
    const badge = eventTypeBadges[eventType as keyof typeof eventTypeBadges] || eventTypeBadges['author-reading'];
    
    return (
      <Card className="overflow-hidden hover:shadow-xl transition-shadow mb-4">
        <div className="p-4 md:p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <span className={`inline-block px-2 py-1 text-xs font-medium rounded mb-2 ${badge.color}`}>
                {badge.label}
              </span>
              
              <h3 className="font-serif font-bold text-base md:text-lg lg:text-xl text-[#5F4B32] mb-1 break-words">
                {event.title}
              </h3>
            </div>
            
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
                <Link href={`/bookshop/${bookshopSlug}`} className="text-[#2A6B7C] hover:underline">
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
      <section className="w-full py-6 md:py-8 lg:py-10 bg-[#F7F3E8]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-[#5F4B32] mb-4 md:mb-6">
              Literary Events at Independent Bookshops
            </h1>
            <p className="font-sans text-sm md:text-base text-gray-700 leading-relaxed">
              Find author readings, book clubs, and special events at indie bookshops near you. 
              Discover the literary experiences that make local bookstores vital community spaces.
            </p>
          </div>
        </div>
      </section>

      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {eventsLoading || bookshopsLoading ? (
            <div className="text-center py-10">
              <p className="font-sans text-base text-gray-700">Loading events...</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-8 max-w-4xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              </div>

              <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                  <h2 className="font-serif text-2xl md:text-3xl font-bold text-[#5F4B32]">
                    Upcoming Events
                    {filteredEvents.length > 0 && (
                      <span className="font-sans text-lg font-normal text-gray-600 ml-2">
                        ({filteredEvents.length})
                      </span>
                    )}
                  </h2>

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
                        {locationFilter !== 'all' || eventTypeFilter !== 'all' 
                          ? 'Try adjusting your filters to see more events.'
                          : "We're growing our events calendar with help from bookshops across America."}
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        {(locationFilter !== 'all' || eventTypeFilter !== 'all') && (
                          <Button 
                            variant="outline"
                            onClick={() => {
                              setLocationFilter('all');
                              setEventTypeFilter('all');
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

      <section className="py-8 md:py-12 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#F7F3E8] rounded-lg p-6 md:p-8">
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#5F4B32] mb-6 text-center">
              Explore More
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/" className="block p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow text-center">
                <h3 className="font-serif font-bold text-lg text-[#5F4B32] mb-2">Home</h3>
                <p className="text-sm text-gray-600">Discover featured bookshops</p>
              </Link>
              <Link href="/directory" className="block p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow text-center">
                <h3 className="font-serif font-bold text-lg text-[#5F4B32] mb-2">Directory</h3>
                <p className="text-sm text-gray-600">Browse all bookshops</p>
              </Link>
              <Link href="/submit-event" className="block p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow text-center">
                <h3 className="font-serif font-bold text-lg text-[#5F4B32] mb-2">Submit Event</h3>
                <p className="text-sm text-gray-600">Add your event</p>
              </Link>
              <Link href="/blog" className="block p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow text-center">
                <h3 className="font-serif font-bold text-lg text-[#5F4B32] mb-2">Blog</h3>
                <p className="text-sm text-gray-600">Read bookshop stories</p>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
