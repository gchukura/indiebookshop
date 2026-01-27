'use client';

import React from 'react';
import Link from 'next/link';
import BookshopSubmissionForm from '@/components/BookshopSubmissionForm';
import { Button } from '@/components/ui/button';

export default function SubmitPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#5F4B32] mb-4">
          Submit an Independent Bookshop
        </h1>
        <p className="font-sans text-base md:text-lg text-gray-700 mb-6">
          Help us grow our directory of independent bookshops across America. Submit a new bookshop or suggest updates to an existing one.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <BookshopSubmissionForm />
          </div>
        </div>

        <div>
          <div className="bg-[#F7F3E8] rounded-lg shadow-sm p-6 sticky top-24">
            <h3 className="font-serif text-xl font-bold text-[#5F4B32] mb-4">
              Submission Guidelines
            </h3>
            <ul className="space-y-4">
              <li className="flex">
                <div className="mr-3 text-[#E16D3D] font-bold">1.</div>
                <p className="font-sans text-sm text-gray-700">
                  Gather all key details including name, address, contact information, opening hours, and website URL.
                </p>
              </li>
              <li className="flex">
                <div className="mr-3 text-[#E16D3D] font-bold">2.</div>
                <p className="font-sans text-sm text-gray-700">
                  Complete all required fields in the form. Be as detailed as possible in the description to help readers understand what makes your bookshop special.
                </p>
              </li>
              <li className="flex">
                <div className="mr-3 text-[#E16D3D] font-bold">3.</div>
                <p className="font-sans text-sm text-gray-700">
                  Select all applicable features for your bookshop. These help readers find stores that match their specific interests.
                </p>
              </li>
              <li className="flex">
                <div className="mr-3 text-[#E16D3D] font-bold">4.</div>
                <p className="font-sans text-sm text-gray-700">
                  While optional, adding a high-quality photo of your storefront or interior significantly increases visitor interest.
                </p>
              </li>
              <li className="flex">
                <div className="mr-3 text-[#E16D3D] font-bold">5.</div>
                <p className="font-sans text-sm text-gray-700">
                  Double-check all information for accuracy, especially your address and contact details before submitting.
                </p>
              </li>
              <li className="flex">
                <div className="mr-3 text-[#E16D3D] font-bold">6.</div>
                <p className="font-sans text-sm text-gray-700">
                  After submission, you'll receive a confirmation email. Our team will review your listing, typically within 3-5 business days.
                </p>
              </li>
            </ul>

            <div className="border-t border-gray-200 mt-6 pt-6">
              <p className="font-sans text-sm text-gray-700 mb-4">
                Want to add events for your bookshop? Submit events to our calendar once your bookshop is listed.
              </p>
              <Link href="/submit-event">
                <Button className="bg-[#2A6B7C] hover:bg-[#2A6B7C]/90 text-white w-full">
                  Submit an Event
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      <section className="mt-12 bg-[#F7F3E8] rounded-lg p-6">
        <h2 className="font-serif text-2xl font-bold text-[#5F4B32] mb-4">
          Why Submit Your Bookshop to Our Directory?
        </h2>
        <div className="space-y-4">
          <p className="font-sans text-base text-gray-700">
            Independent bookshops are vital cultural hubs that foster community, creativity, and intellectual curiosity. By submitting your bookshop to our directory, you'll reach a wider audience of book lovers actively seeking independent bookstores in their area.
          </p>
          <p className="font-sans text-base text-gray-700">
            Our directory helps connect readers with independent bookshops across America. Whether you're a small neighborhood shop, a specialized bookstore, or a community-focused indie retailer, our platform helps you connect with engaged readers searching for unique literary experiences.
          </p>
        </div>
      </section>

      <section className="py-8 md:py-12 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#F7F3E8] rounded-lg p-6 md:p-8">
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#5F4B32] mb-6 text-center">
              Explore Our Directory
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/" className="block p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow text-center">
                <h3 className="font-serif font-bold text-lg text-[#5F4B32] mb-2">Home</h3>
                <p className="text-sm text-gray-600">Discover featured bookshops</p>
              </Link>
              <Link href="/directory" className="block p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow text-center">
                <h3 className="font-serif font-bold text-lg text-[#5F4B32] mb-2">Directory</h3>
                <p className="text-sm text-gray-600">Browse all bookshops</p>
              </Link>
              <Link href="/about" className="block p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow text-center">
                <h3 className="font-serif font-bold text-lg text-[#5F4B32] mb-2">About</h3>
                <p className="text-sm text-gray-600">Learn about us</p>
              </Link>
              <Link href="/contact" className="block p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow text-center">
                <h3 className="font-serif font-bold text-lg text-[#5F4B32] mb-2">Contact</h3>
                <p className="text-sm text-gray-600">Get in touch</p>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
