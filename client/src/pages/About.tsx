import React, { useMemo } from "react";
import { MapPin, Mail, Award, Heart, BookOpen, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { SEO } from "../components/SEO";
import { BASE_URL, PAGE_KEYWORDS, DESCRIPTION_TEMPLATES } from "../lib/seo";

const AboutPage = () => {
  // SEO metadata for the About page
  const seoTitle = useMemo(() => {
    return "About IndieBookShop.com | Supporting Independent Bookshops Across America";
  }, []);
  
  const seoDescription = useMemo(() => {
    return 'Learn about IndieBookShop.com and our mission to support independent bookshops across America. Discover how we connect readers with local indie bookstores through our comprehensive directory.';
  }, []);
  
  const seoKeywords = useMemo(() => {
    return [
      "about IndiebookShop.com",
      "independent bookstore directory",
      "indie bookshop mission",
      "support local bookstores",
      "bookshop community",
      "bookstore advocacy",
      "indie bookseller network",
      "independent bookshop directory",
      "local bookstore finder",
      "bookshop support mission",
      "indie bookshop community",
      "why independent bookstores matter",
      "bookstore directory mission",
      "local bookshop champions",
      "book community platform",
      ...PAGE_KEYWORDS.about.additionalKeywords
    ];
  }, []);
  
  const canonicalUrl = useMemo(() => {
    return `${BASE_URL}/about`;
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
      
      <section className="mb-16">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h1 className="text-4xl font-serif font-bold text-[#5F4B32] mb-4">
            About IndieBookShop.com | Supporting Independent Bookshops
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
                  Our Mission: Supporting Independent Bookshops
                </h2>
                <p className="text-gray-700 mb-6">
                  At IndieBookShop.com, we believe that independent bookstores are vital cultural hubs that foster community, creativity, and intellectual curiosity. In a world dominated by algorithms and corporate retail, indie bookshops offer something invaluable: personal connection, curation by real book lovers, and spaces where ideas and literary communities can flourish.
                </p>
                <p className="text-gray-700 mb-6">
                  Our mission is simple but powerful: to help readers discover and support independent bookstores across North America. We're building the most comprehensive, user-friendly directory that connects book lovers with their perfect local indie bookshop, whether they're looking for specialized collections, author events, or community gathering spaces.
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
                  Why Independent Bookshops Matter
                </h2>
                <p className="text-gray-700 mb-4">
                  Independent bookshops are vital cultural assets in communities across America, offering much more than just places to buy books.
                </p>
                <ul className="space-y-4">
                  <li className="flex">
                    <div className="mr-4 mt-1">
                      <Heart className="w-5 h-5 text-[#E16D3D]" />
                    </div>
                    <div>
                      <h3 className="font-medium text-[#5F4B32]">Community Anchors</h3>
                      <p className="text-gray-700">Indie bookshops create welcoming gathering spaces for meaningful connections, literary discussions, and community events that bring readers together.</p>
                    </div>
                  </li>
                  <li className="flex">
                    <div className="mr-4 mt-1">
                      <Heart className="w-5 h-5 text-[#E16D3D]" />
                    </div>
                    <div>
                      <h3 className="font-medium text-[#5F4B32]">Local Economic Impact</h3>
                      <p className="text-gray-700">When you support local independent bookshops, more of your money stays in your community, helping to create jobs and strengthen the local economy.</p>
                    </div>
                  </li>
                  <li className="flex">
                    <div className="mr-4 mt-1">
                      <Heart className="w-5 h-5 text-[#E16D3D]" />
                    </div>
                    <div>
                      <h3 className="font-medium text-[#5F4B32]">Literary Diversity</h3>
                      <p className="text-gray-700">Independent booksellers champion diverse voices and stories that might otherwise go untold, creating more inclusive literary communities.</p>
                    </div>
                  </li>
                  <li className="flex">
                    <div className="mr-4 mt-1">
                      <Heart className="w-5 h-5 text-[#E16D3D]" />
                    </div>
                    <div>
                      <h3 className="font-medium text-[#5F4B32]">Personalized Book Discovery</h3>
                      <p className="text-gray-700">Thoughtful recommendations from knowledgeable booksellers who genuinely care about your reading experience, helping you discover books you might never find through algorithms.</p>
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
            Our Story: Building a Community of Independent Bookshop Advocates
          </h2>
          <p className="text-gray-600">
            From book lovers to independent bookstore champions
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8 md:p-12">
          <div className="prose prose-stone max-w-none">
            <p>
              IndieBookShop.com began with a simple question: "How can we help independent bookshops thrive in the digital age?" As avid readers and passionate supporters of local businesses, we were concerned about the challenges facing indie bookshops – from rising rents to competition from e-commerce giants and chain retailers.
            </p>
            
            <p>
              In 2023, we set out to create a comprehensive directory that would help readers discover the magic of independent bookstores in their communities and while traveling. Our team – a mix of dedicated book lovers, technology experts, and former booksellers – built this platform to bridge the gap between the convenience of online discovery and the irreplaceable experience of walking into a well-curated independent bookshop.
            </p>
            
            <p>
              What started as a passion project has grown into one of the most comprehensive directories of independent bookstores in North America. We're constantly improving our platform based on feedback from both readers and booksellers, working to create meaningful connections that strengthen local literary ecosystems and support independent bookshops everywhere.
            </p>
            
            <p>
              Today, IndieBookShop.com is proud to feature thousands of independent bookshops across the United States and Canada, with plans to expand our coverage globally. We're more than just a directory – we're a community of people who believe in the cultural importance of independent bookstores and their vital role in creating diverse, vibrant communities centered around the love of reading.
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