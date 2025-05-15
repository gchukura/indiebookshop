import React, { useMemo } from "react";
import { Link } from "wouter";
import EventSubmissionForm from "@/components/EventSubmissionForm";
import { Button } from "@/components/ui/button";
import { SEO } from "../components/SEO";
import { BASE_URL } from "../lib/seo";

const SubmitEvent = () => {
  // SEO metadata
  const seoTitle = useMemo(() => {
    return "Submit a Bookstore Event | Independent Bookshop Event Calendar";
  }, []);
  
  const seoDescription = useMemo(() => {
    return "Share your bookstore's author signings, book clubs, reading groups, and literary events with our community. Submit indie bookshop events to our comprehensive events calendar.";
  }, []);
  
  const seoKeywords = useMemo(() => {
    return [
      "submit bookstore event",
      "indie bookshop events",
      "bookstore reading calendar",
      "author signing submission",
      "literary events directory",
      "book club listings",
      "independent bookstore events",
      "bookshop event calendar",
      "promote book signing",
      "advertise author talk"
    ];
  }, []);
  
  const canonicalUrl = useMemo(() => {
    return `${BASE_URL}/submit-event`;
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
        <h1 className="text-3xl font-serif font-bold text-[#5F4B32] mb-4">
          Submit a Bookstore Event
        </h1>
        <p className="text-gray-600 mb-6">
          Share your upcoming literary events, book signings, author talks, and more with our community.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <EventSubmissionForm />
          </div>
        </div>

        <div>
          <div className="bg-[#F7F3E8] rounded-lg shadow-sm p-6 sticky top-24">
            <h2 className="text-xl font-serif font-bold text-[#5F4B32] mb-4">
              Event Submission Guidelines
            </h2>
            <ul className="space-y-4">
              <li className="flex">
                <div className="mr-3 text-[#E16D3D] font-bold">1.</div>
                <p className="text-gray-700">
                  Events must be hosted by or directly associated with an independent bookstore in our directory.
                </p>
              </li>
              <li className="flex">
                <div className="mr-3 text-[#E16D3D] font-bold">2.</div>
                <p className="text-gray-700">
                  Please provide accurate details including the correct bookstore ID (you can find this in the URL of the bookstore's page on our site).
                </p>
              </li>
              <li className="flex">
                <div className="mr-3 text-[#E16D3D] font-bold">3.</div>
                <p className="text-gray-700">
                  Include all relevant information such as whether the event is virtual or in-person, if registration is required, and any costs associated.
                </p>
              </li>
              <li className="flex">
                <div className="mr-3 text-[#E16D3D] font-bold">4.</div>
                <p className="text-gray-700">
                  Submit your event at least one week in advance to ensure it appears on our calendar.
                </p>
              </li>
            </ul>

            <div className="border-t border-gray-200 mt-6 pt-6">
              <p className="text-gray-700 mb-4">
                Don't see your bookstore in our directory yet? Submit it first to be able to add events.
              </p>
              <Link href="/submit">
                <Button className="bg-[#2A6B7C] hover:bg-[#2A6B7C]/90 text-white w-full">
                  Add Your Bookstore
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* SEO-friendly content section */}
      <section className="mt-12 bg-[#F7F3E8] rounded-lg p-6">
        <h2 className="text-2xl font-serif font-bold text-[#5F4B32] mb-4">
          Why Share Your Bookstore Events With Us?
        </h2>
        <div className="prose prose-p:text-gray-700 max-w-none">
          <p>
            Independent bookshops are cultural hubs that bring communities together through literary events. By submitting your bookstore events to our calendar, you'll reach a wider audience of book lovers actively seeking literary gatherings, author signings, and reading groups in their area.
          </p>
          <p>
            Our event directory helps connect readers with independent bookstores across America. Whether you're hosting a major author signing, an intimate book club meeting, a children's storytime, or a writing workshop, our platform helps you promote these events to engaged readers searching for literary experiences.
          </p>
          <p>
            Book events at indie bookshops contribute significantly to local literary culture and community building. They provide spaces for readers to connect with authors, discover new books, and engage with fellow book lovers. Your events help strengthen the vital ecosystem of independent bookstores that form the backbone of America's literary landscape.
          </p>
        </div>
      </section>
    </div>
  );
};

export default SubmitEvent;