import { useQuery } from "@tanstack/react-query";
import { Event } from "@shared/schema";
import { logger } from "@/lib/logger";
import { useEffect } from "react";

export const useEvents = () => {
  return useQuery<Event[]>({
    queryKey: ["/api/events"],
  });
};

export const useEventsByBookshop = (bookshopId: number) => {
  const query = useQuery<Event[]>({
    queryKey: ["/api/bookstores", bookshopId, "events"],
    enabled: !!bookshopId,
  });
  
  useEffect(() => {
    if (query.isError && query.error) {
      logger.error('Failed to fetch events by bookshop', query.error, {
        queryKey: ["/api/bookstores", bookshopId, "events"],
        bookshopId,
        hook: 'useEventsByBookshop'
      });
    }
  }, [query.isError, query.error, bookshopId]);
  
  return query;
};

export const useCalendarEvents = (year: number, month: number) => {
  const query = useQuery<Event[]>({
    queryKey: ["/api/events/calendar", { year, month }],
    queryFn: async ({ queryKey }) => {
      const [_, { year, month }] = queryKey as [string, { year: number, month: number }];
      try {
        const response = await fetch(`/api/events/calendar?year=${year}&month=${month + 1}`);
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`Failed to fetch calendar events: ${response.status} ${errorText}`);
        }
        const data = await response.json();
        logger.debug('Calendar events fetched successfully', { year, month, count: data.length });
        return data;
      } catch (error) {
        logger.error('Error in useCalendarEvents queryFn', error, { year, month });
        throw error;
      }
    },
  });
  
  useEffect(() => {
    if (query.isError && query.error) {
      logger.error('Failed to fetch calendar events', query.error, {
        queryKey: ["/api/events/calendar", { year, month }],
        year,
        month,
        hook: 'useCalendarEvents'
      });
    }
  }, [query.isError, query.error, year, month]);
  
  return query;
};