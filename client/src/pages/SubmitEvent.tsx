import React from "react";
import { Link } from "wouter";
import EventSubmissionForm from "@/components/EventSubmissionForm";
import { Button } from "@/components/ui/button";

const SubmitEvent = () => {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
    </div>
  );
};

export default SubmitEvent;