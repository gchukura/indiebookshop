'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Metadata } from 'next';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    reason: '',
    subject: '',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [validationError, setValidationError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!formData.name || formData.name.trim().length < 2) {
      setValidationError('Name is required and must be at least 2 characters');
      setSubmitStatus('error');
      return;
    }

    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setValidationError('Please enter a valid email address');
      setSubmitStatus('error');
      return;
    }

    if (!formData.reason) {
      setValidationError('Please select a reason for contacting us');
      setSubmitStatus('error');
      return;
    }

    if (!formData.subject || formData.subject.trim().length < 3) {
      setValidationError('Subject is required and must be at least 3 characters');
      setSubmitStatus('error');
      return;
    }

    if (!formData.message || formData.message.trim().length < 10) {
      setValidationError('Message is required and must be at least 10 characters');
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to send message. Please try again.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        setSubmitStatus('error');
        return;
      }

      const data = await response.json();
      setSubmitStatus('success');
      setFormData({ name: '', email: '', reason: '', subject: '', message: '' });
    } catch (error) {
      setSubmitStatus('error');
      console.error('Contact form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <>
      {/* Hero Section */}
      <section className="py-6 md:py-8 lg:py-10 bg-[#F7F3E8]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-[#5F4B32] mb-4 md:mb-6">
              Get in Touch
            </h1>
            <p className="font-sans text-sm md:text-base text-gray-700 leading-relaxed">
              Have a question, suggestion, or want to help us grow the directory? We'd love to hear from you.
            </p>
          </div>
        </div>
      </section>

      {/* Before You Contact Section */}
      <section className="py-6 md:py-8 lg:py-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border-l-4 border-[#2A6B7C] p-6 md:p-8 lg:p-10">
              <h2 className="font-serif text-2xl md:text-3xl font-bold text-[#5F4B32] mb-4 md:mb-6">
                Looking for Something Specific?
              </h2>
              <div className="space-y-3 font-sans text-sm md:text-base text-gray-700">
                <p className="flex items-start">
                  <span className="text-[#E16D3D] font-semibold mr-2">→</span>
                  <span>
                    <strong>Add a bookshop:</strong>{' '}
                    <Link href="/submit" className="text-[#2A6B7C] underline hover:text-[#E16D3D] transition-colors">
                      Use our submission form
                    </Link>
                  </span>
                </p>
                <p className="flex items-start">
                  <span className="text-[#E16D3D] font-semibold mr-2">→</span>
                  <span>
                    <strong>Submit an event:</strong>{' '}
                    <Link href="/submit-event" className="text-[#2A6B7C] underline hover:text-[#E16D3D] transition-colors">
                      Share your bookshop event
                    </Link>
                  </span>
                </p>
                {/* FAQ no longer on site
                <p className="flex items-start">
                  <span className="text-[#E16D3D] font-semibold mr-2">→</span>
                  <span>
                    <strong>Common questions:</strong>{' '}
                    <Link href="/about#faq" className="text-[#2A6B7C] underline hover:text-[#E16D3D] transition-colors">
                      Check our FAQ
                    </Link>
                  </span>
                </p>
                */}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-6 md:py-8 lg:py-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-6 md:p-8 lg:p-10">
              <div className="mb-6 md:mb-8">
                <h2 className="font-serif text-2xl md:text-3xl font-bold text-[#5F4B32] mb-3 md:mb-4">
                  Send Us a Message
                </h2>
                <p className="font-sans text-sm md:text-base text-gray-600">
                  We typically respond within 2-3 business days.
                </p>
              </div>

              {submitStatus === 'success' && (
                <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded">
                  <p className="font-sans text-sm md:text-base text-green-800">
                    <strong>Thank you!</strong> Your message has been sent. We'll get back to you soon.
                  </p>
                </div>
              )}

              {submitStatus === 'error' && (
                <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded">
                  <p className="font-sans text-sm md:text-base text-red-800">
                    <strong>Oops!</strong>{' '}
                    {validationError || "Something went wrong. Please try again or email us directly at"}{' '}
                    {!validationError && (
                      <a href="mailto:info@bluestonebrands.com" className="underline hover:text-red-900 transition-colors">
                        info@bluestonebrands.com
                      </a>
                    )}
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="font-sans text-sm font-medium text-gray-700">
                    Your Name <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    id="name" 
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Enter your name" 
                    required
                    className="font-sans border border-gray-300 rounded-lg focus:border-[#2A6B7C] focus:ring-[#2A6B7C] focus:ring-2 focus:ring-offset-0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="font-sans text-sm font-medium text-gray-700">
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="your.email@example.com" 
                    required
                    className="font-sans border border-gray-300 rounded-lg focus:border-[#2A6B7C] focus:ring-[#2A6B7C] focus:ring-2 focus:ring-offset-0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason" className="font-sans text-sm font-medium text-gray-700">
                    What is this regarding? <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={formData.reason} 
                    onValueChange={(value) => handleChange('reason', value)}
                    required
                  >
                    <SelectTrigger className="font-sans border border-gray-300 rounded-lg focus:border-[#2A6B7C] focus:ring-[#2A6B7C] focus:ring-2 focus:ring-offset-0">
                      <SelectValue placeholder="Select a reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="listing-update">Update a bookshop listing</SelectItem>
                      <SelectItem value="listing-issue">Report incorrect listing information</SelectItem>
                      <SelectItem value="partnership">Partnership or collaboration</SelectItem>
                      <SelectItem value="technical">Technical issue with the site</SelectItem>
                      <SelectItem value="feedback">General feedback or suggestion</SelectItem>
                      <SelectItem value="press">Press or media inquiry</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject" className="font-sans text-sm font-medium text-gray-700">
                    Subject <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    id="subject" 
                    value={formData.subject}
                    onChange={(e) => handleChange('subject', e.target.value)}
                    placeholder="Brief summary of your message" 
                    required
                    className="font-sans border border-gray-300 rounded-lg focus:border-[#2A6B7C] focus:ring-[#2A6B7C] focus:ring-2 focus:ring-offset-0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="font-sans text-sm font-medium text-gray-700">
                    Message <span className="text-red-500">*</span>
                  </Label>
                  <Textarea 
                    id="message" 
                    value={formData.message}
                    onChange={(e) => handleChange('message', e.target.value)}
                    placeholder="Tell us more about your inquiry..." 
                    className="h-40 font-sans border border-gray-300 rounded-lg focus:border-[#2A6B7C] focus:ring-[#2A6B7C] focus:ring-2 focus:ring-offset-0 resize-none" 
                    required
                  />
                  <p className="text-xs text-gray-500 font-sans">
                    Please provide as much detail as possible to help us respond effectively.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 md:p-6">
                  <p className="text-xs md:text-sm text-gray-600 font-sans leading-relaxed">
                    By submitting this form, you agree that we may use your email address to respond to your inquiry. 
                    We will never share your information with third parties or use it for marketing purposes.
                  </p>
                </div>

                <Button 
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#E16D3D] hover:bg-[#d06a4f] text-white rounded-full px-6 py-3 min-h-[44px] font-semibold w-full text-base md:text-sm transition-colors"
                >
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Alternative Contact Methods Section */}
      <section className="py-6 md:py-8 lg:py-10 bg-[#F7F3E8]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-[#5F4B32] mb-6 md:mb-8 text-center">
              Other Ways to Reach Us
            </h2>
            
            <div className="grid md:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
              <div className="bg-white rounded-lg shadow-sm p-4 md:p-5 lg:p-6">
                <div className="flex items-start mb-4">
                  <Mail className="w-6 h-6 text-[#2A6B7C] mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="font-serif text-xl md:text-2xl font-bold text-[#5F4B32] mb-2">
                      Email Us Directly
                    </h3>
                    <p className="font-sans text-sm md:text-base text-gray-600 mb-3">
                      Prefer to use your own email client?
                    </p>
                    <a 
                      href="mailto:info@bluestonebrands.com?subject=IndieBookShop Directory Inquiry" 
                      className="font-sans text-[#2A6B7C] font-semibold hover:text-[#E16D3D] underline text-sm md:text-base break-all transition-colors"
                    >
                      info@bluestonebrands.com
                    </a>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4 md:p-5 lg:p-6">
                <div className="flex items-start mb-4">
                  <Clock className="w-6 h-6 text-[#2A6B7C] mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="font-serif text-xl md:text-2xl font-bold text-[#5F4B32] mb-2">
                      Response Time
                    </h3>
                    <p className="font-sans text-sm md:text-base text-gray-700 leading-relaxed">
                      We typically respond within 2-3 business days. For urgent issues regarding 
                      incorrect or harmful listing information, please include "URGENT" in your subject line.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 md:mt-8 text-center">
              <p className="font-sans text-sm md:text-base text-gray-700 leading-relaxed max-w-2xl mx-auto">
                We're dedicated to supporting independent bookshops across America. Whether you're a reader 
                looking for your next literary haven or a bookshop owner wanting to be featured, we're here to help.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Internal Links Section for SEO */}
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
    </>
  );
}
