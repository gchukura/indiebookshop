import { FC, useMemo } from "react";
import { Link } from "wouter";
import BookshopSubmissionForm from "../components/BookshopSubmissionForm";
import { SEO } from "../components/SEO";
import { BASE_URL } from "../lib/seo";
import { Button } from "@/components/ui/button";
import { H1, H2, H3, Body, BodySmall } from "@/components/Typography";

const SubmitBookshop: FC = () => {
  // SEO metadata
  const seoTitle = useMemo(() => {
    return "Submit a Bookshop | Add to Our Independent Bookshop Directory";
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
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* SEO Component */}
      <SEO 
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        canonicalUrl={canonicalUrl}
      />
      
      <div className="mb-8">
        <H1 className="text-[#5F4B32] mb-4">
          Submit an Independent Bookshop
        </H1>
        <Body className="mb-6">
          Help us grow our directory of independent bookshops across America. Submit a new bookshop or suggest updates to an existing one.
        </Body>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <BookshopSubmissionForm />
          </div>
        </div>

        <div>
          <div className="bg-[#F7F3E8] rounded-lg shadow-sm p-6 sticky top-24">
            <H3 className="text-[#5F4B32] mb-4">
              Submission Guidelines
            </H3>
            <ul className="space-y-4">
              <li className="flex">
                <div className="mr-3 text-[#E16D3D] font-bold">1.</div>
                <BodySmall>
                  Gather all key details including name, address, contact information, opening hours, and website URL.
                </BodySmall>
              </li>
              <li className="flex">
                <div className="mr-3 text-[#E16D3D] font-bold">2.</div>
                <BodySmall>
                  Complete all required fields in the form. Be as detailed as possible in the description to help readers understand what makes your bookshop special.
                </BodySmall>
              </li>
              <li className="flex">
                <div className="mr-3 text-[#E16D3D] font-bold">3.</div>
                <BodySmall>
                  Select all applicable features for your bookshop. These help readers find stores that match their specific interests.
                </BodySmall>
              </li>
              <li className="flex">
                <div className="mr-3 text-[#E16D3D] font-bold">4.</div>
                <BodySmall>
                  While optional, adding a high-quality photo of your storefront or interior significantly increases visitor interest.
                </BodySmall>
              </li>
              <li className="flex">
                <div className="mr-3 text-[#E16D3D] font-bold">5.</div>
                <BodySmall>
                  Double-check all information for accuracy, especially your address and contact details before submitting.
                </BodySmall>
              </li>
              <li className="flex">
                <div className="mr-3 text-[#E16D3D] font-bold">6.</div>
                <BodySmall>
                  After submission, you'll receive a confirmation email. Our team will review your listing, typically within 3-5 business days.
                </BodySmall>
              </li>
            </ul>

            <div className="border-t border-gray-200 mt-6 pt-6">
              <BodySmall className="mb-4">
                Want to add events for your bookshop? Submit events to our calendar once your bookshop is listed.
              </BodySmall>
              <Link href="/submit-event">
                <Button className="bg-[#2A6B7C] hover:bg-[#2A6B7C]/90 text-white w-full">
                  Submit an Event
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* SEO-friendly content section */}
      <section className="mt-12 bg-[#F7F3E8] rounded-lg p-6">
        <H2 className="text-[#5F4B32] mb-4">
          Why Submit Your Bookshop to Our Directory?
        </H2>
        <div className="space-y-4">
          <Body>
            Independent bookshops are vital cultural hubs that foster community, creativity, and intellectual curiosity. By submitting your bookshop to our directory, you'll reach a wider audience of book lovers actively seeking independent bookstores in their area.
          </Body>
          <Body>
            Our directory helps connect readers with independent bookshops across America. Whether you're a small neighborhood shop, a specialized bookstore, or a community-focused indie retailer, our platform helps you connect with engaged readers searching for unique literary experiences.
          </Body>
          <Body>
            Independent bookshops contribute significantly to local literary culture and community building. They provide spaces for readers to discover new books, connect with authors, and engage with fellow book lovers. Your bookshop helps strengthen the vital ecosystem of independent retailers that form the backbone of America's literary landscape.
          </Body>
        </div>
      </section>
    </div>
  );
};

export default SubmitBookshop;