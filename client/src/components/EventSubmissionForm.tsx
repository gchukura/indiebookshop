import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { format } from "date-fns";
import { CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Bookstore } from "@shared/schema";

// Simple form for event submission
const EventSubmissionForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("");
  const [bookstoreId, setBookstoreId] = useState<number | null>(null);
  const [bookshopSearchOpen, setBookshopSearchOpen] = useState(false);
  const { toast } = useToast();

  // Fetch all bookshops for the selector
  const { data: bookshops = [], isLoading: isLoadingBookshops } = useQuery<Bookstore[]>({
    queryKey: ['bookshops-for-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookstores')
        .select('id, name, city, state')
        .eq('live', true)
        .order('name');
      
      if (error) throw error;
      
      return (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        city: item.city,
        state: item.state,
      })) as Bookstore[];
    }
  });

  const selectedBookshop = bookshops.find(b => b.id === bookstoreId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!bookstoreId) {
      toast({
        title: "Error",
        description: "Please select a bookshop.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);

    try {
      // Format date as YYYY-MM-DD
      const formattedDate = date ? format(date, "yyyy-MM-dd") : "";

      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          date: formattedDate,
          time,
          bookstoreId: bookstoreId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit event");
      }

      // Reset form
      setTitle("");
      setDescription("");
      setDate(undefined);
      setTime("");
      setBookstoreId(null);

      toast({
        title: "Success!",
        description: "Your event has been submitted.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit event. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Event Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter the event title"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Bookshop</Label>
        <Popover open={bookshopSearchOpen} onOpenChange={setBookshopSearchOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={bookshopSearchOpen}
              className="w-full justify-between"
              disabled={isLoadingBookshops}
            >
              {selectedBookshop
                ? `${selectedBookshop.name} - ${selectedBookshop.city}, ${selectedBookshop.state}`
                : "Search for a bookshop..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search bookshops by name, city, or state..." />
              <CommandList>
                <CommandEmpty>No bookshop found.</CommandEmpty>
                <CommandGroup>
                  {bookshops.map((bookshop) => (
                    <CommandItem
                      key={bookshop.id}
                      value={`${bookshop.name} ${bookshop.city} ${bookshop.state}`}
                      onSelect={() => {
                        setBookstoreId(bookshop.id);
                        setBookshopSearchOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          bookstoreId === bookshop.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{bookshop.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {bookshop.city}, {bookshop.state}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {!bookstoreId && (
          <p className="text-sm text-muted-foreground">
            Select the bookshop hosting this event
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Event Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="time">Event Time</Label>
          <Input
            id="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder="e.g., 7:00 PM"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Event Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the event"
          rows={4}
          required
        />
      </div>

      <Button
        type="submit"
        className="bg-[#4A7C59] hover:bg-[#4A7C59]/90 text-white w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Submitting..." : "Submit Event"}
      </Button>
    </form>
  );
};

export default EventSubmissionForm;