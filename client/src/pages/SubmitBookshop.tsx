import { FC, useMemo } from "react";
import BookshopSubmissionForm from "../components/BookshopSubmissionForm";
import { SEO } from "../components/SEO";
import { BASE_URL } from "../lib/seo";
import HowToGuide from "../components/HowToGuide";

const SubmitBookshop: FC = () => {
  // SEO metadata
  const seoTitle = useMemo(() => {
    return "Submit a Bookshop | Add to Our Independent Bookstore Directory";
  }, []);
  
  const seoDescription = useMemo(() => {
    return "Help grow our directory of independent bookshops across America. Submit a new indie bookstore or suggest updates to an existing one to improve our free bookshop finder service.";
  }, []);
  
  const seoKeywords = useMemo(() => {
    return [
      "submit bookshop",
      "add bookstore to directory",
      "independent bookshop listing",
      "indie bookstore submission",
      "register bookshop",
      "add bookstore information",
      "bookshop directory submission",
      "list my bookstore",
      "update bookshop listing",
      "indie bookshop registration"
    ];
  }, []);
  
  const canonicalUrl = useMemo(() => {
    return `${BASE_URL}/submit-bookshop`;
  }, []);

  return (
    <div className="container py-8 md:py-12">
      {/* SEO Component */}
      <SEO 
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        canonicalUrl={canonicalUrl}
      />
      
      <div className="max-w-3xl mx-auto mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-4 text-center text-[#5F4B32] font-serif">
          Submit an Independent Bookshop
        </h1>
        
        <p className="text-center text-gray-600 mb-4">
          Help us grow our directory of independent bookshops across America. Submit a new bookshop or suggest updates to an existing one.
        </p>
        
        <p className="text-center text-gray-600 mb-8">
          Our mission is to connect readers with local independent bookstores. Your submission helps support the vibrant community of indie bookshops nationwide.
        </p>
        
        {/* How-To Guide */}
        <HowToGuide
          title="How to Submit Your Bookshop"
          description="Follow these simple steps to add your independent bookshop to our directory"
          image={`${BASE_URL}/images/submit-bookshop-guide.jpg`}
          totalTime="PT10M"
          steps={[
            {
              name: "Gather Your Bookshop Information",
              text: "Collect all the key details about your bookshop including the complete name, address, contact information, opening hours, and website URL. If you have social media accounts or special features (like a coffee shop or event space), have those details ready too."
            },
            {
              name: "Fill Out the Submission Form",
              text: "Complete all required fields in the form below. Be as detailed as possible in the description - this helps readers know what makes your bookshop special! You can include information about your specialties, history, community involvement, and unique offerings."
            },
            {
              name: "Add Special Features",
              text: "Select all applicable features for your bookshop. These help readers find stores that match their specific interests. If you have a feature not listed, mention it in the description field."
            },
            {
              name: "Upload a Photo (Optional)",
              text: "While not required, adding a high-quality photo of your storefront or interior significantly increases visitor interest. Images should be at least 800x600 pixels in JPG or PNG format."
            },
            {
              name: "Review and Submit",
              text: "Double-check all information for accuracy, especially your address and contact details. Once you're satisfied, click the Submit button to send your listing for review."
            },
            {
              name: "Confirmation and Review",
              text: "After submission, you'll receive a confirmation email. Our team will review your listing, typically within 3-5 business days, before publishing it to the directory."
            }
          ]}
          className="mb-12"
        />
        
        <BookshopSubmissionForm />
      </div>
    </div>
  );
};

export default SubmitBookshop;