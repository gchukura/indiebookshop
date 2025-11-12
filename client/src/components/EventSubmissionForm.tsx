import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Simple form for event submission
const EventSubmissionForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("");
  const [bookstoreId, setBookstoreId] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
          bookstoreId: parseInt(bookstoreId),
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
      setBookstoreId("");

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
        <Label htmlFor="bookstoreId">Bookshop ID</Label>
        <Input
          id="bookstoreId"
          value={bookstoreId}
          onChange={(e) => setBookstoreId(e.target.value)}
          placeholder="Enter the bookshop ID"
          type="number"
          required
        />
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