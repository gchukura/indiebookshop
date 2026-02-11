"use client"

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const Footer = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/newsletter-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast({
          title: "Subscription failed",
          description: (data as { error?: string }).error ?? "Please try again later.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Subscribed!",
        description: "Thank you for joining our newsletter.",
      });
      setEmail("");
    } catch (error) {
      toast({
        title: "Subscription failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Newsletter Section - Reserve space to prevent layout shifts */}
      <section
        className="py-8 md:py-12 lg:py-16 bg-[#F7F3E8] text-[#5F4B32]"
        style={{
          minHeight: '280px',
          containIntrinsicSize: 'auto 280px'
        }}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2
            className="text-xl md:text-2xl font-serif font-bold mb-3"
            style={{
              minHeight: '32px',
              lineHeight: '1.2'
            }}
          >
            Join Our Literary Community
          </h2>
          <p
            className="font-sans text-sm md:text-base text-gray-700 max-w-2xl mx-auto mb-4"
            style={{
              minHeight: '48px',
              lineHeight: '1.5'
            }}
          >
            Connect with fellow book lovers, stay updated on bookshop events, and discover new independent bookshops.
          </p>
          <div className="max-w-md mx-auto" style={{ minHeight: '60px' }}>
            <form className="flex flex-col sm:flex-row gap-2 justify-center items-stretch" onSubmit={handleSubscribe}>
              <div className="flex-grow">
                <input
                  type="email"
                  placeholder="Your email address"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-[#2A6B7C] focus:ring-[#2A6B7C] focus:ring-2 focus:ring-offset-0"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ minHeight: '44px' }}
                />
              </div>
              <Button
                type="submit"
                className="bg-[#E16D3D] hover:bg-[#d06a4f] text-white px-4 py-2 h-full rounded-full min-h-[44px]"
                disabled={isSubmitting}
                style={{ minHeight: '44px' }}
              >
                {isSubmitting ? "Subscribing..." : "Subscribe"}
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer - Reserve space to prevent layout shifts */}
      <footer
        className="bg-[#5F4B32] py-8 md:py-12"
        style={{
          minHeight: '200px',
          containIntrinsicSize: 'auto 200px'
        }}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mb-8">
            {/* Navigation Links */}
            <div>
              <h3 className="font-serif font-bold text-white mb-4 text-sm md:text-base">Directory</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/"
                    className="font-sans text-sm text-gray-300 hover:text-white hover:underline transition-colors"
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    href="/directory"
                    className="font-sans text-sm text-gray-300 hover:text-white hover:underline transition-colors"
                  >
                    Browse All Bookshops
                  </Link>
                </li>
                <li>
                  <Link
                    href="/events"
                    className="font-sans text-sm text-gray-300 hover:text-white hover:underline transition-colors"
                  >
                    Events
                  </Link>
                </li>
                <li>
                  <Link
                    href="/submit-bookshop"
                    className="font-sans text-sm text-gray-300 hover:text-white hover:underline transition-colors"
                  >
                    Submit a Bookshop
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-serif font-bold text-white mb-4 text-sm md:text-base">About</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/about"
                    className="font-sans text-sm text-gray-300 hover:text-white hover:underline transition-colors"
                  >
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="font-sans text-sm text-gray-300 hover:text-white hover:underline transition-colors"
                  >
                    Contact
                  </Link>
                </li>
                <li>
                  <Link
                    href="/blog"
                    className="font-sans text-sm text-gray-300 hover:text-white hover:underline transition-colors"
                  >
                    Blog
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-serif font-bold text-white mb-4 text-sm md:text-base">Resources</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/submit-event"
                    className="font-sans text-sm text-gray-300 hover:text-white hover:underline transition-colors"
                  >
                    Submit an Event
                  </Link>
                </li>
                <li>
                  <a
                    href="https://www.google.com/maps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-sans text-sm text-gray-300 hover:text-white hover:underline transition-colors"
                  >
                    Find on Google Maps
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-serif font-bold text-white mb-4 text-sm md:text-base">Connect</h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="mailto:info@bluestonebrands.com"
                    className="font-sans text-sm text-gray-300 hover:text-white hover:underline transition-colors"
                  >
                    Email Us
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/20 pt-6 text-center">
            <p
              className="font-sans text-sm md:text-base text-gray-100"
              style={{
                minHeight: '20px',
                lineHeight: '1.5'
              }}
            >
              &copy; {new Date().getFullYear()} IndieBookShop.com. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;
