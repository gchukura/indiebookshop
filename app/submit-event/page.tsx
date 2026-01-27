'use client';

import React from 'react';
import Link from 'next/link';
import EventSubmissionForm from '@/components/EventSubmissionForm';
import { Button } from '@/components/ui/button';

export default function SubmitEventPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#5F4B32] mb-4">
          Submit a Bookshop Event
        </h1>
        <p className="font-sans text-base md:text-lg text-gray-700 mb-6">
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
            <h3 className="font-serif text-xl font-bold text-[#5F4B32] mb-4">
              Event Submission Guidelines
            </h3>
            <ul className="space-y-4">
              <li className="flex">
                <div className="mr-3 text-[#E16D3D] font-bold">1.</div>
                <p className="font-sans text-sm text-gray-700">
                  Events must be hosted by or directly associated with an independent bookshop in our directory.
                </p>
              </li>
              <li className="flex">
                <div className="mr-3 text-[#E16D3D] font-bold">2.</div>
                <p className="font-sans text-sm text-gray-700">
                  Please provide accurate details including the correct bookshop ID (you can find this in the URL of the bookshop's page on our site).
                </p>
              </li>
              <li className="flex">
                <div className="mr-3 text-[#E16D3D] font-bold">3.</div>
                <p className="font-sans text-sm text-gray-700">
                  Include all relevant information such as whether the event is virtual or in-person, if registration is required, and any costs associated.
                </p>
              </li>
              <li className="flex">
                <div className="mr-3 text-[#E16D3D] font-bold">4.</div>
                <p className="font-sans text-sm text-gray-700">
                  Submit your event at least one week in advance to ensure it appears on our calendar.
                </p>
              </li>
            </ul>

            <div className="border-t border-gray-200 mt-6 pt-6">
              <p className="font-sans text-sm text-gray-700 mb-4">
                Don't see your bookshop in our directory yet? Submit it first to be able to add events.
              </p>
              <Link href="/submit">
                <Button className="bg-[#2A6B7C] hover:bg-[#2A6B7C]/90 text-white w-full">
                  Add Your Bookshop
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      <section className="mt-12 bg-[#F7F3E8] rounded-lg p-6">
        <h2 className="font-serif text-2xl font-bold text-[#5F4B32] mb-4">
          Why Share Your Bookshop Events With Us?
        </h2>
        <div className="space-y-4">
          <p className="font-sans text-base text-gray-700">
            Independent bookshops are cultural hubs that bring communities together through literary events. By submitting your bookshop events to our calendar, you'll reach a wider audience of book lovers actively seeking literary gatherings, author signings, and reading groups in their area.
          </p>
          <p className="font-sans text-base text-gray-700">
            Our event directory helps connect readers with independent bookshops across America. Whether you're hosting a major author signing, an intimate book club meeting, a children's storytime, or a writing workshop, our platform helps you promote these events to engaged readers searching for literary experiences.
          </p>
        </div>
      </section>

      <section className="py-8 md:py-12 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#F7F3E8] rounded-lg p-6 md:p-8">
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#5F4B32] mb-6 text-center">
              Explore More
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/events" className="block p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow text-center">
                <h3 className="font-serif font-bold text-lg text-[#5F4B32] mb-2">Events</h3>
                <p className="text-sm text-gray-600">View all events</p>
              </Link>
              <Link href="/directory" className="block p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow text-center">
                <h3 className="font-serif font-bold text-lg text-[#5F4B32] mb-2">Directory</h3>
                <p className="text-sm text-gray-600">Browse all bookshops</p>
              </Link>
              <Link href="/submit" className="block p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow text-center">
                <h3 className="font-serif font-bold text-lg text-[#5F4B32] mb-2">Submit Bookshop</h3>
                <p className="text-sm text-gray-600">Add your bookshop</p>
              </Link>
              <Link href="/about" className="block p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow text-center">
                <h3 className="font-serif font-bold text-lg text-[#5F4B32] mb-2">About</h3>
                <p className="text-sm text-gray-600">Learn about us</p>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
