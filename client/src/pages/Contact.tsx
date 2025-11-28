import React, { useMemo } from "react";
import { MapPin, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SEO } from "../components/SEO";
import { BASE_URL } from "../lib/seo";

const Contact = () => {
  // SEO metadata
  const seoTitle = useMemo(() => {
    return "Contact IndieBookShop.com | Get in Touch with Our Independent Bookshop Directory";
  }, []);
  
  const seoDescription = useMemo(() => {
    return "Contact the team at IndieBookShop.com. Submit additions or corrections to our independent bookshop directory, suggest features, or ask questions about our mission to support local indie bookstores.";
  }, []);
  
  const seoKeywords = useMemo(() => {
    return [
      "contact IndieBookShop",
      "indie bookshop directory contact",
      "independent bookstore directory support",
      "submit bookshop listing",
      "update bookshop information",
      "indie bookshop directory help",
      "contact bookshop directory",
      "bookstore directory support",
      "indie bookshop questions",
      "independent bookstore community contact"
    ];
  }, []);
  
  const canonicalUrl = useMemo(() => {
    return `${BASE_URL}/contact`;
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
      
      <div className="max-w-3xl mx-auto mb-12">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif font-bold text-[#5F4B32] mb-4">
          Contact Our Independent Bookshop Directory
        </h1>
        <p className="text-lg md:text-xl text-gray-600">
          We'd love to hear from independent bookshop enthusiasts and booksellers
        </p>
      </div>

      <div className="max-w-2xl mx-auto mb-16">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-serif font-bold text-[#5F4B32] mb-4">
            Contact Our Independent Bookshop Directory Team
          </h2>
          
          <p className="text-gray-700 mb-6">
            Use the form below to get in touch with our team about our independent bookshop directory. Whether you want to submit a new bookshop, update an existing listing, report an error, or suggest a feature, we're here to help support the indie bookshop community.
          </p>
          
          <form className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input id="name" placeholder="Enter your name" aria-label="Your name" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" placeholder="Enter your email address" aria-label="Your email address" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" placeholder="What is this regarding?" aria-label="Message subject" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" placeholder="Enter your message here" className="h-32" aria-label="Your message" />
            </div>
            
            <Button className="bg-[#E16D3D] hover:bg-[#E16D3D]/90 text-white w-full">
              Send Message
            </Button>
          </form>
        </div>
      </div>
      
      {/* Contact Information Section */}
      <div className="max-w-2xl mx-auto mb-16">
        <div className="bg-[#F7F3E8] rounded-lg p-8">
          <h2 className="text-2xl font-serif font-bold text-[#5F4B32] mb-4">
            Other Ways to Connect with Our Bookshop Directory
          </h2>
          
          <p className="text-gray-700 mb-6">
            We're dedicated to supporting independent bookshops across America. If you prefer alternate methods of communication, please use the options below:
          </p>
          
          <div className="space-y-4">
            <div className="flex items-start">
              <Mail className="w-5 h-5 text-[#2A6B7C] mt-1 mr-3" />
              <div>
                <h3 className="font-medium text-[#5F4B32]">Email Us</h3>
                <p className="text-gray-700">For directory updates, feedback, or general inquiries: <a href="mailto:info@bluestonebrands.com" className="text-[#2A6B7C] hover:underline">info@bluestonebrands.com</a></p>
              </div>
            </div>
            
            <div className="flex items-start">
              <MapPin className="w-5 h-5 text-[#2A6B7C] mt-1 mr-3" />
              <div>
                <h3 className="font-medium text-[#5F4B32]">Submit a Bookshop</h3>
                <p className="text-gray-700">Know an independent bookshop that should be in our directory? Use our <a href="/submit-bookshop" className="text-[#2A6B7C] hover:underline">submission form</a> to add it to our growing list.</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <Phone className="w-5 h-5 text-[#2A6B7C] mt-1 mr-3" />
              <div>
                <h3 className="font-medium text-[#5F4B32]">Response Time</h3>
                <p className="text-gray-700">We aim to respond to all inquiries within 2-3 business days. For urgent matters related to our independent bookshop directory, please indicate so in your subject line.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;