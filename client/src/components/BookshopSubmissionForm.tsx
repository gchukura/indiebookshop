import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Bookstore as Bookshop, Feature } from "@shared/schema";
import { STATES } from "@/lib/constants";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// Form validation schema for submission
// Address fields are only required if hasPhysicalStore is true
const submissionFormSchema = z.object({
  submitterName: z.string().min(2, {
    message: "Your name must be at least 2 characters.",
  }),
  submitterEmail: z.string().email({
    message: "Please enter a valid email address.",
  }),
  submissionType: z.enum(["new", "change"]),
  existingBookshopName: z.string().optional(),
  name: z.string().min(2, {
    message: "Bookshop name must be at least 2 characters.",
  }),
  // Address fields are optional, but required if hasPhysicalStore is true
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  description: z.string().optional(),
  website: z.union([
    z.string().url({ message: "Please enter a valid URL (e.g., https://example.com)." }),
    z.literal(""),
  ]).optional(),
  phone: z.string().optional(),
  hours: z.string().optional(),
  featureIds: z.array(z.number()).optional(),
  hasPhysicalStore: z.boolean().default(true),
}).refine((data) => {
  // If hasPhysicalStore is true, address fields are required
  if (data.hasPhysicalStore) {
    return data.street && data.street.length >= 2;
  }
  return true;
}, {
  message: "Street address is required (at least 2 characters).",
  path: ["street"],
}).refine((data) => {
  if (data.hasPhysicalStore) {
    return data.city && data.city.length >= 2;
  }
  return true;
}, {
  message: "City is required (at least 2 characters).",
  path: ["city"],
}).refine((data) => {
  if (data.hasPhysicalStore) {
    return data.state && data.state.length >= 1;
  }
  return true;
}, {
  message: "State is required.",
  path: ["state"],
}).refine((data) => {
  if (data.hasPhysicalStore) {
    return data.zip && data.zip.length >= 1;
  }
  return true;
}, {
  message: "Zip code is required.",
  path: ["zip"],
});

type SubmissionFormValues = z.infer<typeof submissionFormSchema>;

export const BookshopSubmissionForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFeatures, setSelectedFeatures] = useState<number[]>([]);
  const [bookshopSearchOpen, setBookshopSearchOpen] = useState(false);
  const { toast } = useToast();

  // Fetch all features
  const { data: features = [] } = useQuery<Feature[]>({
    queryKey: ["/api/features"],
  });


  // Default values for the form
  const defaultValues: Partial<SubmissionFormValues> = {
    submissionType: "new",
    submitterName: "",
    submitterEmail: "",
    name: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    description: "",
    website: "",
    phone: "",
    hours: "",
    hasPhysicalStore: true,
  };

  const form = useForm<SubmissionFormValues>({
    resolver: zodResolver(submissionFormSchema),
    defaultValues,
    mode: "onChange", // Validate on change for better UX
  });

  const submissionType = form.watch("submissionType");
  const selectedBookshopName = form.watch("existingBookshopName");

  // Fetch all bookshops for the selector (when editing)
  const { data: bookshops = [], isLoading: isLoadingBookshops } = useQuery<Bookshop[]>({
    queryKey: ['bookshops-for-editing'],
    queryFn: async () => {
      if (!supabase) {
        throw new Error('Supabase client not available');
      }
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
      })) as Bookshop[];
    },
    enabled: submissionType === "change",
  });

  const selectedBookshop = bookshops.find(b => 
    `${b.name} - ${b.city}, ${b.state}` === selectedBookshopName
  );

  // Form submission handler
  const onSubmit = async (data: SubmissionFormValues) => {
    console.log("Form submission started", data);
    setIsSubmitting(true);
    try {
      // Prepare the submission data
      const isNewSubmission = data.submissionType === "new";
      const bookshopData = {
        name: data.name,
        // Only include address fields if hasPhysicalStore is true
        street: data.hasPhysicalStore ? (data.street || "") : "",
        city: data.hasPhysicalStore ? (data.city || "") : "",
        state: data.hasPhysicalStore ? (data.state || "") : "",
        zip: data.hasPhysicalStore ? (data.zip || "") : "",
        description: data.description || "",
        website: data.website || "",
        phone: data.phone || "",
        hours: data.hours || "",
        featureIds: selectedFeatures.join(","),
      };

      console.log("Sending submission to API:", {
        submitterEmail: data.submitterEmail,
        submitterName: data.submitterName,
        isNewSubmission,
        bookshopData,
      });

      // Send submission to the API
      const response = await apiRequest(
        "POST",
        "/api/bookstores/submit",
        {
          submitterEmail: data.submitterEmail,
          submitterName: data.submitterName,
          isNewSubmission,
          existingBookshopName: !isNewSubmission ? data.existingBookshopName : undefined,
          bookstoreData: bookshopData, // Note: backend expects 'bookstoreData', not 'bookshopData'
        }
      );

      console.log("API response received:", response.status);

      // Parse response to get message
      const result = await response.json();
      console.log("API response data:", result);

      // Show success message - COMMENTED OUT: Users don't need to see this notification
      // toast({
      //   title: "Submission Successful",
      //   description: result.message || "Thank you for your submission! We'll review it shortly.",
      // });

      // Reset the form
      form.reset(defaultValues);
      setSelectedFeatures([]);
    } catch (error) {
      console.error("Submission error:", error);
      // Show error message with more details
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast({
        title: "Submission Failed",
        description: `There was a problem submitting your bookshop: ${errorMessage}. Please check the browser console for details.`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle feature selection/deselection
  const toggleFeature = (featureId: number) => {
    setSelectedFeatures((prev) =>
      prev.includes(featureId)
        ? prev.filter((id) => id !== featureId)
        : [...prev, featureId]
    );
  };

  const hasPhysicalStore = form.watch("hasPhysicalStore");

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Submit a Bookshop</CardTitle>
        <CardDescription>
          Help us grow our directory of independent bookshops by submitting a new bookshop or suggesting changes to an existing one.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form 
            onSubmit={form.handleSubmit(
              (data) => {
                console.log("Form validation passed, calling onSubmit");
                onSubmit(data);
              },
              (errors) => {
                console.error("Form validation failed:", errors);
                // Get the first error message to show
                const firstError = Object.values(errors)[0];
                const errorMessage = firstError?.message || "Please check the form and fix any errors before submitting.";
                toast({
                  title: "Validation Error",
                  description: errorMessage,
                  variant: "destructive",
                });
              }
            )} 
            className="space-y-6"
          >
            {/* Submission Type Selection */}
            <FormField
              control={form.control}
              name="submissionType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>What would you like to do?</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="new" id="new" />
                        <label htmlFor="new" className="font-sans text-body-sm font-semibold peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Submit a new bookshop
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="change" id="change" />
                        <label htmlFor="change" className="font-sans text-body-sm font-semibold peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Suggest changes to an existing bookshop
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* If updating, ask for existing bookshop name */}
            {submissionType === "change" && (
              <FormField
                control={form.control}
                name="existingBookshopName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Existing Bookshop</FormLabel>
                    <FormControl>
                      <Popover open={bookshopSearchOpen} onOpenChange={setBookshopSearchOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
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
                                {bookshops.map((bookshop) => {
                                  const displayValue = `${bookshop.name} - ${bookshop.city}, ${bookshop.state}`;
                                  return (
                                    <CommandItem
                                      key={bookshop.id}
                                      value={`${bookshop.name} ${bookshop.city} ${bookshop.state}`}
                                      onSelect={() => {
                                        field.onChange(displayValue);
                                        setBookshopSearchOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          selectedBookshopName === displayValue ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <div className="flex flex-col">
                                        <span className="font-medium">{bookshop.name}</span>
                                        <span className="text-sm text-muted-foreground">
                                          {bookshop.city}, {bookshop.state}
                                        </span>
                                      </div>
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </FormControl>
                    <FormDescription>
                      Select the bookshop you want to update
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="submitterName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="submitterEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Bookshop Information */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bookshop Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter bookshop name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Physical Location Switch */}
            <FormField
              control={form.control}
              name="hasPhysicalStore"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Physical Location</FormLabel>
                    <FormDescription>
                      Does this bookshop have a physical retail location?
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {hasPhysicalStore && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="street"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Main St" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="City" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a state" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {STATES.map((state) => (
                              <SelectItem key={state} value={state}>
                                {state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="zip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zip Code</FormLabel>
                        <FormControl>
                          <Input placeholder="Zip Code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>


              </>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="(555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://www.example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="hours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hours (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Mon-Fri: 9am-6pm, Sat-Sun: 10am-4pm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell us about this bookshop..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Features */}
            <div className="space-y-2">
              <FormLabel>Features (optional)</FormLabel>
              <div className="grid grid-cols-2 gap-2">
                {Array.isArray(features) && features.map((feature) => (
                  <div
                    key={feature.id}
                    className={`border rounded p-2 cursor-pointer ${
                      selectedFeatures.includes(feature.id)
                        ? "bg-primary/10 border-primary"
                        : "border-gray-200"
                    }`}
                    onClick={() => toggleFeature(feature.id)}
                  >
                    {feature.name}
                  </div>
                ))}
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting}
              onClick={(e) => {
                console.log("Submit button clicked");
                // Let the form handle submission
              }}
            >
              {isSubmitting ? "Submitting..." : "Submit Bookshop"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default BookshopSubmissionForm;