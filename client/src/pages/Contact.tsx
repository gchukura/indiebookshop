import React from "react";
import { MapPin, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const Contact = () => {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-3xl mx-auto text-center mb-12">
        <h1 className="text-4xl font-serif font-bold text-[#5F4B32] mb-4">
          Contact Us
        </h1>
        <p className="text-xl text-gray-600">
          We'd love to hear from you
        </p>
      </div>

      <div className="max-w-2xl mx-auto mb-16">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-serif font-bold text-[#5F4B32] mb-6">
            Get in Touch
          </h2>
          
          <form className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Your Name</Label>
              <Input id="name" placeholder="Enter your name" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" placeholder="Enter your email address" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" placeholder="What is this regarding?" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" placeholder="Enter your message here" className="h-32" />
            </div>
            
            <Button className="bg-[#E16D3D] hover:bg-[#E16D3D]/90 text-white w-full">
              Send Message
            </Button>
          </form>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <h2 className="text-2xl font-serif font-bold text-[#5F4B32] mb-4">
          Interested in Partnering With Us?
        </h2>
        <p className="text-gray-700 max-w-2xl mx-auto mb-6">
          We're always looking for potential partnerships with organizations that support independent bookstores and literary culture. Whether you're a publisher, literary organization, or book-adjacent business, we'd love to hear from you.
        </p>
        <Button className="bg-[#2A6B7C] hover:bg-[#2A6B7C]/90 text-white px-6">
          Explore Partnerships
        </Button>
      </div>
    </div>
  );
};

export default Contact;