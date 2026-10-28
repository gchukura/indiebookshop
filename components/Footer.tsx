"use client"

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/** `showBlog` is false when content/blog has no posts. */
const Footer = ({ showBlog = true }: { showBlog?: boolean }) => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Shown under the form (not a toast, so every page doesn't ship the toast library)
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus(null);

    try {
      const res = await fetch("/api/newsletter-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus({ ok: false, message: (data as { error?: string }).error ?? "Subscription failed. Please try again later." });
        return;
      }
      setStatus({ ok: true, message: "Subscribed! Thank you for joining our newsletter." });
      setEmail("");
    } catch {
      setStatus({ ok: false, message: "Subscription failed. Please try again later." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Newsletter Section - Reserve space to prevent layout shifts */}
      <section
        className="py-8 md:py-12 lg:py-16 bg-brand-cream text-brand-brown"
        style={{
          minHeight: '280px',
          containIntrinsicSize: 'auto 280px'
        }}
      >
        <div className="container-site text-center">
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
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-brand-teal focus:ring-brand-teal focus:ring-2 focus:ring-offset-0"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{ minHeight: '44px' }}
                />
              </div>
              <Button
                type="submit"
                variant="accent"
                className="px-4 py-2 h-full min-h-[44px]"
                disabled={isSubmitting}
                style={{ minHeight: '44px' }}
              >
                {isSubmitting ? "Subscribing..." : "Subscribe"}
              </Button>
            </form>
            <p role="status" aria-live="polite" className={`mt-2 text-sm ${status?.ok === false ? "text-red-700" : "text-brand-brown"}`}>
              {status?.message}
            </p>
          </div>
        </div>
      </section>

      {/* Footer - Reserve space to prevent layout shifts */}
      <footer
        className="bg-brand-brown py-8 md:py-12"
        style={{
          minHeight: '200px',
          containIntrinsicSize: 'auto 200px'
        }}
      >
        <div className="container-site">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mb-8">
            {/* Navigation Links */}
            <div>
              <h3 className="font-serif font-bold text-white mb-4 text-sm md:text-base">Directory</h3>
              <ul>
                <li>
                  <Link
                    href="/"
                    className="inline-flex min-h-[44px] min-w-[44px] items-center font-sans text-sm text-gray-300 hover:text-white hover:underline transition-colors"
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    href="/directory"
                    className="inline-flex min-h-[44px] min-w-[44px] items-center font-sans text-sm text-gray-300 hover:text-white hover:underline transition-colors"
                  >
                    Browse All Bookshops
                  </Link>
                </li>
                <li>
                  <Link
                    href="/bookshops"
                    className="inline-flex min-h-[44px] min-w-[44px] items-center font-sans text-sm text-gray-300 hover:text-white hover:underline transition-colors"
                  >
                    Bookshops by State
                  </Link>
                </li>
                <li>
                  <Link
                    href="/events"
                    className="inline-flex min-h-[44px] min-w-[44px] items-center font-sans text-sm text-gray-300 hover:text-white hover:underline transition-colors"
                  >
                    Events
                  </Link>
                </li>
                <li>
                  <Link
                    href="/submit-bookshop"
                    className="inline-flex min-h-[44px] min-w-[44px] items-center font-sans text-sm text-gray-300 hover:text-white hover:underline transition-colors"
                  >
                    Submit a Bookshop
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-serif font-bold text-white mb-4 text-sm md:text-base">About</h3>
              <ul>
                <li>
                  <Link
                    href="/about"
                    className="inline-flex min-h-[44px] min-w-[44px] items-center font-sans text-sm text-gray-300 hover:text-white hover:underline transition-colors"
                  >
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="inline-flex min-h-[44px] min-w-[44px] items-center font-sans text-sm text-gray-300 hover:text-white hover:underline transition-colors"
                  >
                    Contact
                  </Link>
                </li>
                {showBlog && (
                  <li>
                    <Link
                      href="/blog"
                      className="inline-flex min-h-[44px] min-w-[44px] items-center font-sans text-sm text-gray-300 hover:text-white hover:underline transition-colors"
                    >
                      Blog
                    </Link>
                  </li>
                )}
              </ul>
            </div>

            <div>
              <h3 className="font-serif font-bold text-white mb-4 text-sm md:text-base">Resources</h3>
              <ul>
                <li>
                  <Link
                    href="/submit-event"
                    className="inline-flex min-h-[44px] min-w-[44px] items-center font-sans text-sm text-gray-300 hover:text-white hover:underline transition-colors"
                  >
                    Submit an Event
                  </Link>
                </li>
                <li>
                  <a
                    href="https://www.google.com/maps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] min-w-[44px] items-center font-sans text-sm text-gray-300 hover:text-white hover:underline transition-colors"
                  >
                    Find on Google Maps
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-serif font-bold text-white mb-4 text-sm md:text-base">Connect</h3>
              <ul>
                <li>
                  <a
                    href="mailto:info@bluestonebrands.com"
                    className="inline-flex min-h-[44px] min-w-[44px] items-center font-sans text-sm text-gray-300 hover:text-white hover:underline transition-colors"
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
