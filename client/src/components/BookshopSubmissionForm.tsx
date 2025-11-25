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
import { Bookstore as Bookshop, Feature } from "@shared/schema";
import { STATES } from "@/lib/constants";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

// Form validation schema for submission
const submissionFormSchema = z.object({
  submitterName: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  submitterEmail: z.string().email({
    message: "Please enter a valid email address.",
  }),
  submissionType: z.enum(["new", "change"]),
  existingBookshopId: z.string().optional(),
  name: z.string().min(2, {
    message: "Bookshop name must be at least 2 characters.",
  }),
  street: z.string().min(2, {
    message: "Street address is required.",
  }),
  city: z.string().min(2, {
    message: "City is required.",
  }),
  state: z.string().min(1, {
    message: "State is required.",
  }),
  zip: z.string().min(1, {
    message: "Zip code is required.",
  }),
  description: z.string().optional(),
  website: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal("")),
  phone: z.string().optional(),
  hours: z.string().optional(),
  featureIds: z.array(z.number()).optional(),
  hasPhysicalStore: z.boolean().default(true),
});

type SubmissionFormValues = z.infer<typeof submissionFormSchema>;

export const BookshopSubmissionForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFeatures, setSelectedFeatures] = useState<number[]>([]);
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
  });

  // Debug: Log form errors
  const formErrors = form.formState.errors;
  if (Object.keys(formErrors).length > 0) {
    console.log("Form validation errors:", formErrors);
  }

  // Form submission handler
  const onSubmit = async (data: SubmissionFormValues) => {
    console.log("Form submission started", data);
    setIsSubmitting(true);
    try {
      // Prepare the submission data
      const isNewSubmission = data.submissionType === "new";
      const bookshopData = {
        name: data.name,
        street: data.street,
        city: data.city,
        state: data.state,
        zip: data.zip,
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
          existingBookshopId: !isNewSubmission ? data.existingBookshopId : undefined,
          bookstoreData: bookshopData, // Note: backend expects 'bookstoreData', not 'bookshopData'
        }
      );

      console.log("API response received:", response.status);

      // Parse response to get message
      const result = await response.json();
      console.log("API response data:", result);

      // Show success message
      toast({
        title: "Submission Successful",
        description: result.message || "Thank you for your submission! We'll review it shortly.",
      });

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

  const submissionType = form.watch("submissionType");
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
                toast({
                  title: "Validation Error",
                  description: "Please check the form and fix any errors before submitting.",
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

            {/* If updating, ask for existing bookshop ID */}
            {submissionType === "change" && (
              <FormField
                control={form.control}
                name="existingBookshopId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Existing Bookshop ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter bookshop ID (found in URL)" {...field} />
                    </FormControl>
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