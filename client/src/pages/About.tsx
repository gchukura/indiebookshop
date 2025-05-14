import React from "react";
import { MapPin, Mail, Award, Heart, BookOpen, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const AboutPage = () => {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <section className="mb-16">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h1 className="text-4xl font-serif font-bold text-[#5F4B32] mb-4">
            About IndieBookShop.com
          </h1>
          <p className="text-xl text-gray-600">
            Connecting readers with independent bookstores since 2023
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-12">
          <div className="grid md:grid-cols-2 gap-0">
            <div className="p-8 md:p-12 flex items-center">
              <div>
                <h2 className="text-2xl font-serif font-bold text-[#5F4B32] mb-4">
                  Our Mission
                </h2>
                <p className="text-gray-700 mb-6">
                  At IndieBookShop.com, we believe that independent bookstores are vital cultural hubs that foster community, creativity, and intellectual curiosity. In a world dominated by algorithms and corporate retail, indie bookshops offer something invaluable: personal connection, curation by real book lovers, and spaces where ideas can flourish.
                </p>
                <p className="text-gray-700 mb-6">
                  Our mission is simple but powerful: to help readers discover and support independent bookstores across North America. We're building the most comprehensive, user-friendly directory that connects book lovers with their perfect local bookshop.
                </p>
                <div className="flex flex-wrap gap-4 mt-6">
                  <div className="flex items-center text-[#2A6B7C]">
                    <BookOpen className="w-5 h-5 mr-2" />
                    <span>500+ Bookstores</span>
                  </div>
                  <div className="flex items-center text-[#2A6B7C]">
                    <MapPin className="w-5 h-5 mr-2" />
                    <span>50+ States & Provinces</span>
                  </div>
                  <div className="flex items-center text-[#2A6B7C]">
                    <Users className="w-5 h-5 mr-2" />
                    <span>10,000+ Monthly Visitors</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-[#F7F3E8] p-8 md:p-12">
              <div className="h-full flex flex-col justify-center">
                <h2 className="text-2xl font-serif font-bold text-[#5F4B32] mb-4">
                  Why Independent Bookstores Matter
                </h2>
                <ul className="space-y-4">
                  <li className="flex">
                    <div className="mr-4 mt-1">
                      <Heart className="w-5 h-5 text-[#E16D3D]" />
                    </div>
                    <div>
                      <h3 className="font-medium text-[#5F4B32]">Community Anchors</h3>
                      <p className="text-gray-700">Indie bookstores create gathering spaces for meaningful connection and conversation.</p>
                    </div>
                  </li>
                  <li className="flex">
                    <div className="mr-4 mt-1">
                      <Heart className="w-5 h-5 text-[#E16D3D]" />
                    </div>
                    <div>
                      <h3 className="font-medium text-[#5F4B32]">Economic Impact</h3>
                      <p className="text-gray-700">When you shop at an indie bookstore, more of your money stays in your local economy.</p>
                    </div>
                  </li>
                  <li className="flex">
                    <div className="mr-4 mt-1">
                      <Heart className="w-5 h-5 text-[#E16D3D]" />
                    </div>
                    <div>
                      <h3 className="font-medium text-[#5F4B32]">Cultural Diversity</h3>
                      <p className="text-gray-700">Independent booksellers champion diverse voices and stories that might otherwise go untold.</p>
                    </div>
                  </li>
                  <li className="flex">
                    <div className="mr-4 mt-1">
                      <Heart className="w-5 h-5 text-[#E16D3D]" />
                    </div>
                    <div>
                      <h3 className="font-medium text-[#5F4B32]">Personal Touch</h3>
                      <p className="text-gray-700">Thoughtful recommendations from knowledgeable booksellers who genuinely care about your reading experience.</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-16">
        <div className="max-w-3xl mx-auto text-center mb-8">
          <h2 className="text-3xl font-serif font-bold text-[#5F4B32] mb-4">
            Our Story
          </h2>
          <p className="text-gray-600">
            From book lovers to bookstore champions
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8 md:p-12">
          <div className="prose prose-stone max-w-none">
            <p>
              IndieBookShop.com began with a simple question: "How can we help independent bookstores thrive in the digital age?" As avid readers and supporters of local businesses, we were troubled by the challenges facing indie bookshops – from rising rents to competition from e-commerce giants.
            </p>
            
            <p>
              In 2023, we set out to create a solution that would help readers discover the magic of indie bookstores. Our team – a mix of book lovers, technology experts, and former booksellers – built this platform to bridge the gap between the convenience of online discovery and the irreplaceable experience of walking into a well-curated bookshop.
            </p>
            
            <p>
              What started as a passion project has grown into the most comprehensive directory of independent bookstores in North America. We're constantly improving our platform based on feedback from both readers and booksellers, working to create meaningful connections that strengthen the literary ecosystem.
            </p>
            
            <p>
              Today, IndieBookShop.com is proud to feature hundreds of independent bookstores across the United States and Canada, with plans to expand our coverage globally. We're more than just a directory – we're a community of people who believe in the power of books and the spaces dedicated to them.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-16">
        <div className="bg-[#F7F3E8] rounded-lg p-8 md:p-12 text-center">
          <h2 className="text-3xl font-serif font-bold text-[#5F4B32] mb-6">
            Join Our Mission
          </h2>
          <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            Help us support independent bookstores across North America. Submit a bookstore, spread the word, or partner with us.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/submit">
              <Button className="bg-[#E16D3D] hover:bg-[#E16D3D]/90 text-white px-6 py-3 text-lg">
                Add a Bookstore
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" className="border-[#2A6B7C] text-[#2A6B7C] hover:bg-[#2A6B7C]/10 px-6 py-3 text-lg">
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-serif font-bold text-[#5F4B32] mb-6 text-center">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-xl font-medium text-[#5F4B32] mb-2">How do I add my bookstore to the directory?</h3>
              <p className="text-gray-700">
                You can easily submit your bookstore through our <Link href="/submit" className="text-[#2A6B7C] hover:underline">submission form</Link>. We'll review the information and add it to our directory, typically within 3-5 business days.
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-xl font-medium text-[#5F4B32] mb-2">Is this service free for bookstores?</h3>
              <p className="text-gray-700">
                Yes! Basic listings in our directory are completely free for all legitimate independent bookstores. We believe in supporting the indie bookstore community without barriers.
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-xl font-medium text-[#5F4B32] mb-2">How do you define an "independent" bookstore?</h3>
              <p className="text-gray-700">
                We consider bookstores to be independent if they are not part of a large national chain and have a significant focus on selling books. This includes used bookstores, specialty bookshops, and bookstores that may also sell other items.
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-xl font-medium text-[#5F4B32] mb-2">How can I report an error in a listing?</h3>
              <p className="text-gray-700">
                If you notice any outdated or incorrect information in our directory, please <Link href="/contact" className="text-[#2A6B7C] hover:underline">contact us</Link> with the details. We appreciate your help in keeping our information accurate!
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;