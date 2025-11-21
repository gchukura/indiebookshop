import React, { useMemo } from "react";
import { Heart, Map, Search, Users, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { SEO } from "../components/SEO";
import { BASE_URL, PAGE_KEYWORDS } from "../lib/seo";
import FAQSection from "../components/FAQSection";

const AboutPage = () => {
  // SEO metadata for the About page
  const seoTitle = useMemo(() => {
    return "About IndiebookShop.com | Supporting Independent Bookshops Across America";
  }, []);
  
  const seoDescription = useMemo(() => {
    return 'Learn about IndiebookShop.com and our mission to support independent bookshops across America. Discover how we connect readers with 2,000+ local indie bookshops through our comprehensive directory.';
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
    <>
      {/* SEO Component */}
      <SEO 
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        canonicalUrl={canonicalUrl}
      />
      
      {/* Hero/Intro Section */}
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#F7F3E8] rounded-lg p-6 md:p-8">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-[#5F4B32] mb-6 text-center">
                About IndiebookShop.com
              </h1>
              <div className="prose prose-lg prose-p:text-gray-700 mx-auto">
                <p className="text-xl text-gray-600 text-center mb-8">
                  We're building the most comprehensive directory of independent bookshops in America—making it easy to discover and support the local bookshops that make reading personal.
                </p>
                <p>
                  IndiebookShop.com features over 2,000 independent bookshops across all 50 states—the most comprehensive directory of indie bookshops available. Our searchable database connects book lovers with local independent booksellers, helping you discover unique literary spaces in your neighborhood or while traveling.
                </p>
                <p>
                  We believe that independent bookshops are vital cultural hubs that foster community, support local economies, and celebrate the diversity of literature. In a world where convenience often trumps community, we're here to help readers find the local bookshops that offer something algorithms never can: expert curation, personal connection, and community belonging.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg p-6 md:p-8">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#5F4B32] mb-6 text-center">
                Our Story
              </h2>
              
              {/* Image for visual interest */}
              <div className="mb-8 rounded-lg overflow-hidden shadow-md">
                <img 
                  src="https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&h=400&fit=crop&q=80" 
                  alt="Independent bookshop interior with wooden shelves"
                  className="w-full h-48 md:h-64 object-cover"
                />
              </div>
              
              <div className="prose prose-lg prose-p:text-gray-700 max-w-none">
                <p>
                  IndiebookShop.com was founded in 2025 by a husband-and-wife team who share a love of books and a deep belief in supporting small businesses. With backgrounds in technology, we saw an opportunity to solve a problem many readers face: finding local independent bookshops when online discovery defaults to corporate retailers.
                </p>
                
                <p>
                  While most people want to support their local economy and discover neighborhood bookshops, the easiest path has become clicking through to big-box retailers. We knew there had to be a better way—a comprehensive, searchable directory that made finding indie bookshops as easy as finding chain stores.
                </p>
                
                <p>
                  What started as a passion project has grown into the largest independent bookshop directory in America. Through dedicated manual research and compilation, we've built a database of over 2,000 bookshops across all 50 states. We've spent countless hours researching, verifying, and cataloging independent bookshops-from beloved neighborhood shops to hidden gems in small towns.
                </p>
                
                {/* Pull quote for visual break */}
                <div className="bg-[#F7F3E8] border-l-4 border-[#E16D3D] p-6 my-8 rounded-r-lg flex items-center">
                  <p className="text-lg md:text-xl italic text-gray-700 mb-0">
                    "We've spent countless hours researching and cataloging independent 
                    bookshops - from beloved neighborhood shops to hidden gems in small towns."
                  </p>
                </div>
                
                <p>
                  This is very much a work in progress. While we're proud of our comprehensive coverage, we're continuously improving profiles with better descriptions, photos, and details about what makes each shop special. We're also actively seeking community input—if you know a bookshop we're missing or have updates about a listing, we want to hear from you.
                </p>
                
                <p>
                  Today, IndiebookShop.com isn't just a directory—it's a resource for readers who believe bookshops are more than retail spaces. They're community anchors, cultural hubs, and gathering places for people who love books. Every search, every discovery, every visit to a local bookshop helps ensure these vital spaces continue to thrive.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why It Matters Section */}
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#F7F3E8] rounded-lg p-6 md:p-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#5F4B32] mb-6 text-center">
                Why Independent Bookshops Matter
              </h2>
              <p className="text-base md:text-lg text-gray-700 mb-8 text-center max-w-3xl mx-auto">
                Independent bookshops are vital cultural hubs that foster community connections, support local economies, and celebrate the diversity of literature.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="flex flex-col">
                  <div className="flex items-start mb-4">
                    <Heart className="w-6 h-6 text-[#E16D3D] mr-3 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-serif font-bold text-lg text-[#5F4B32] mb-2">Community Anchors</h3>
                      <p className="text-sm md:text-base text-gray-700">
                        Indie bookshops create welcoming gathering spaces for book clubs, author events, and literary discussions that bring readers together and strengthen community bonds.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col">
                  <div className="flex items-start mb-4">
                    <Heart className="w-6 h-6 text-[#E16D3D] mr-3 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-serif font-bold text-lg text-[#5F4B32] mb-2">Local Economic Impact</h3>
                      <p className="text-sm md:text-base text-gray-700">
                        When you buy from an independent bookshop, approximately 48% of your purchase stays in the local economy—compared to less than 14% at chain stores.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col">
                  <div className="flex items-start mb-4">
                    <Heart className="w-6 h-6 text-[#E16D3D] mr-3 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-serif font-bold text-lg text-[#5F4B32] mb-2">Champion Diverse Voices</h3>
                      <p className="text-sm md:text-base text-gray-700">
                        Independent booksellers have the freedom to stock challenging books, amplify marginalized voices, and champion debut authors often overlooked by mainstream retailers.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col">
                  <div className="flex items-start mb-4">
                    <Heart className="w-6 h-6 text-[#E16D3D] mr-3 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-serif font-bold text-lg text-[#5F4B32] mb-2">Expert Curation</h3>
                      <p className="text-sm md:text-base text-gray-700">
                        Thoughtful recommendations from booksellers who remember what you loved and understand what you're looking for—expertise that algorithms can't replicate.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What Makes Us Different Section */}
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg p-6 md:p-8">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#5F4B32] mb-6 text-center">
                What Makes Us Different
              </h2>
              <div className="space-y-8">
                {/* More Than a Map */}
                <div className="flex items-start">
                  <Map className="w-6 h-6 text-[#E16D3D] mr-4 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-serif font-bold text-lg text-[#5F4B32] mb-2">
                      More Than a Map
                    </h3>
                    <p className="text-sm md:text-base text-gray-700">
                      While map apps can show you bookshop locations, we capture 
                      the character of each shop - their specialties, their vibe, 
                      their role in the community. We help you find not just <em>a</em> bookshop, 
                      but <em>your</em> bookshop.
                    </p>
                  </div>
                </div>
                
                {/* Manually Researched */}
                <div className="flex items-start">
                  <Search className="w-6 h-6 text-[#E16D3D] mr-4 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-serif font-bold text-lg text-[#5F4B32] mb-2">
                      Manually Researched
                    </h3>
                    <p className="text-sm md:text-base text-gray-700">
                      Every bookshop in our directory has been individually researched 
                      and verified. We're not scraping data or relying on automated 
                      systems—we're building this the old-fashioned way, one bookshop at a time.
                    </p>
                  </div>
                </div>
                
                {/* Built by Book Lovers */}
                <div className="flex items-start">
                  <Shield className="w-6 h-6 text-[#E16D3D] mr-4 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-serif font-bold text-lg text-[#5F4B32] mb-2">
                      Built by Book Lovers
                    </h3>
                    <p className="text-sm md:text-base text-gray-700">
                      We're not owned by corporate interests or funded by chains. 
                      We're book lovers building a resource for other book lovers, 
                      with no ulterior motive beyond helping independent bookshops thrive.
                    </p>
                  </div>
                </div>
                
                {/* Community-Driven */}
                <div className="flex items-start">
                  <Users className="w-6 h-6 text-[#E16D3D] mr-4 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-serif font-bold text-lg text-[#5F4B32] mb-2">
                      Community-Driven
                    </h3>
                    <p className="text-sm md:text-base text-gray-700">
                      This directory improves because of people like you. Booksellers 
                      update their profiles, readers suggest missing shops, locals share 
                      insider knowledge. We're building this together.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Join Our Mission Section */}
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#F7F3E8] rounded-lg p-6 md:p-8">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#5F4B32] mb-6 text-center">
                Help Us Grow
              </h2>
              <p className="text-base md:text-lg text-gray-700 mb-8 text-center">
              Know an independent bookshop we're missing? Notice outdated information? Want to improve a listing? We'd love your help making this directory better.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4">
              <Link href="/submit" className="w-full sm:w-auto">
                <Button className="bg-[#E16D3D] hover:bg-[#d06a4f] text-white rounded-full px-8 py-4 min-h-[56px] w-full sm:w-auto font-semibold">
                  Add a Bookshop
                </Button>
              </Link>
              <Link href="/contact" className="w-full sm:w-auto">
                <Button className="bg-[#2A6B7C] hover:bg-[#1d5a6a] text-white rounded-full px-8 py-4 min-h-[56px] w-full sm:w-auto font-semibold">
                  Contact Us
                </Button>
              </Link>
            </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg p-6 md:p-8">
            <FAQSection
              title="Frequently Asked Questions"
              description="Find answers to common questions about IndiebookShop.com and our directory."
              faqs={[
                {
                  question: "How do I add my bookshop to the directory?",
                  answer: "You can submit your bookshop through our <a href='/submit' class='text-[#2A6B7C] hover:text-[#E16D3D] underline'>Add a Bookshop</a> form. We review all submissions and typically add new bookshops within a few days."
                },
                {
                  question: "Is listing in the directory free?",
                  answer: "Yes! Listing in our directory is completely free for all legitimate independent bookshops. We're building this resource to support the indie bookshop community, not to profit from it."
                },
                {
                  question: "How do you define 'independent'?",
                  answer: "We consider bookshops independent if they're not part of a large national chain. This includes used bookshops, specialty bookshops, and stores that sell books alongside other items, as long as books are a primary focus."
                },
                {
                  question: "How can I report an error or update a listing?",
                  answer: "If you notice outdated or incorrect information, please <a href='/contact' class='text-[#2A6B7C] hover:text-[#E16D3D] underline'>contact us</a> with the details. We rely on the community to help keep our directory accurate and appreciate all corrections!"
                },
                {
                  question: "Do you list online-only bookshops?",
                  answer: "We prioritize brick-and-mortar stores since they have the strongest community impact, but we do list online-only independent bookshops that operate as dedicated businesses."
                },
                {
                  question: "What if my business sells books but isn't primarily a bookshop?",
                  answer: "Our directory focuses on businesses where selling books is a primary function. If you have a book-adjacent business (literary café, book-themed shop, etc.), please <a href='/contact' class='text-[#2A6B7C] hover:text-[#E16D3D] underline'>contact us</a> to discuss whether it's a good fit."
                },
                {
                  question: "How often is the directory updated?",
                  answer: "We continuously add new bookshops and update existing listings. We're actively working to improve profile quality with better descriptions, photos, and details about each shop's unique character."
                },
                {
                  question: "Can bookshop owners update their own listings?",
                  answer: "Yes! If you own or manage a bookshop in our directory and want to update your information, <a href='/contact' class='text-[#2A6B7C] hover:text-[#E16D3D] underline'>contact us</a> and we'll help you update your listing or set you up to manage it directly."
                }
              ]}
              className="max-w-3xl mx-auto"
            />
          </div>
        </div>
      </section>
    </>
  );
};

export default AboutPage;
