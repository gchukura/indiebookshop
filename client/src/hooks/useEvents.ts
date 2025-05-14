import { useQuery } from "@tanstack/react-query";
import { Event } from "@shared/schema";

export const useEvents = () => {
  return useQuery<Event[]>({
    queryKey: ["/api/events"],
  });
};

export const useEventsByBookshop = (bookshopId: number) => {
  return useQuery<Event[]>({
    queryKey: ["/api/bookstores", bookshopId, "events"],
    enabled: !!bookshopId,
  });
};

export const useCalendarEvents = (year: number, month: number) => {
  return useQuery<Event[]>({
    queryKey: ["/api/events/calendar", { year, month }],
    queryFn: async ({ queryKey }) => {
      const [_, { year, month }] = queryKey as [string, { year: number, month: number }];
      const response = await fetch(`/api/events/calendar?year=${year}&month=${month + 1}`);
      if (!response.ok) {
        throw new Error("Failed to fetch calendar events");
      }
      return response.json();
    },
  });
};