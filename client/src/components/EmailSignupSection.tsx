import React, { useState } from 'react';
import { Mail } from 'lucide-react';

export const EmailSignupSection: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [isEmailSignupSuccess, setIsEmailSignupSuccess] = useState(false);

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingEmail(true);
    
    try {
      const response = await fetch('/api/newsletter-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      if (response.ok) {
        setIsEmailSignupSuccess(true);
        setEmail('');
      }
    } catch (error) {
      console.error('Newsletter signup error:', error);
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  return (
    <section className="bg-gradient-to-br from-[#2A6B7C]/10 to-[#E16D3D]/10 border-t-2 border-stone-200">
      <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="bg-white rounded-2xl shadow-lg border-2 border-stone-200 p-8 md:p-12 text-center">
          {/* Icon */}
          <div className="w-16 h-16 mx-auto mb-6 bg-[#E16D3D]/10 rounded-full flex items-center justify-center">
            <Mail className="w-8 h-8 text-[#E16D3D]" />
          </div>

          {/* Heading */}
          <h2 className="font-serif text-2xl md:text-3xl text-[#5F4B32] font-bold mb-3">
            Join Our Literary Community
          </h2>
          <p className="text-base md:text-lg text-stone-600 mb-8 max-w-2xl mx-auto">
            Discover new independent bookshops, upcoming events, and support local literary culture. 
            Get our monthly newsletter delivered to your inbox.
          </p>

          {/* Success Message */}
          {isEmailSignupSuccess && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-medium">
                ✓ Thanks for subscribing! Check your email to confirm.
              </p>
            </div>
          )}

          {/* Form */}
          {!isEmailSignupSuccess && (
            <form onSubmit={handleEmailSignup} className="max-w-md mx-auto">
              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="flex-1 px-4 py-3 border-2 border-stone-300 rounded-lg focus:border-[#2A6B7C] focus:outline-none focus:ring-2 focus:ring-[#2A6B7C]/20 transition-colors"
                  required
                  disabled={isSubmittingEmail}
                />
                <button 
                  type="submit"
                  disabled={isSubmittingEmail}
                  className="bg-[#E16D3D] hover:bg-[#C55A2F] disabled:bg-stone-400 text-white font-semibold px-6 py-3 rounded-lg transition-colors whitespace-nowrap"
                >
                  {isSubmittingEmail ? 'Subscribing...' : 'Subscribe'}
                </button>
              </div>
              <p className="text-xs text-stone-500 mt-3">
                We respect your privacy. Unsubscribe at any time.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

export default EmailSignupSection;

