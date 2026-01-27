import type { Metadata } from 'next';
import Link from 'next/link';
import { Book } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Independent Bookshop Blog | Articles about Indie Bookstores',
  description: 'Articles, interviews, and insights about independent bookshops across America. Discover stories about local indie bookstores, author events, bookseller profiles, and the cultural impact of independent bookshops.',
  keywords: ['independent bookshop blog', 'indie bookstore articles', 'bookshop stories', 'local bookshop features'],
};

// Cartoonish Book Worm Mascot component
const BookWormMascot = () => {
  return (
    <div className="relative w-40 h-40 transform scale-90">
      <div className="relative">
        <div className="w-28 h-28 bg-[#7AB87A] rounded-full relative">
          <div className="absolute top-7 left-5 w-5 h-5 bg-white rounded-full">
            <div className="absolute top-1 left-1 w-2.5 h-2.5 bg-black rounded-full"></div>
          </div>
          <div className="absolute top-7 right-5 w-5 h-5 bg-white rounded-full">
            <div className="absolute top-1 left-1 w-2.5 h-2.5 bg-black rounded-full"></div>
          </div>
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-14 h-5 border-b-3 border-black rounded-b-full"></div>
          <div className="absolute top-7 left-1/2 transform -translate-x-1/2 w-20 h-1.5 bg-[#B85C38]"></div>
          <div className="absolute top-5 left-4 w-7 h-7 border-2 border-[#B85C38] rounded-full"></div>
          <div className="absolute top-5 right-4 w-7 h-7 border-2 border-[#B85C38] rounded-full"></div>
        </div>
        <div className="w-20 h-20 bg-[#8BC48B] rounded-full absolute -bottom-6 left-4"></div>
        <div className="w-16 h-16 bg-[#9BD09B] rounded-full absolute -bottom-12 left-10"></div>
        <div className="absolute -top-4 -right-8 transform -rotate-12">
          <div className="w-14 h-16 bg-[#2A6B7C] rounded-r-sm relative">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#235A69]"></div>
            <div className="absolute left-3 top-3 right-2 h-1.5 bg-[#F7F3E8]"></div>
            <div className="absolute left-3 top-6 right-2 h-1.5 bg-[#F7F3E8]"></div>
            <div className="absolute left-3 top-9 right-2 h-1.5 bg-[#F7F3E8]"></div>
          </div>
          <div className="w-14 h-14 bg-[#E16D3D] rounded-r-sm absolute -top-3 -right-3 transform -rotate-6">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#C6582B]"></div>
            <div className="absolute left-3 top-3 right-2 h-1.5 bg-[#F7F3E8]"></div>
            <div className="absolute left-3 top-6 right-2 h-1.5 bg-[#F7F3E8]"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function BlogPage() {
  return (
    <>
      <section className="w-full py-6 md:py-8 lg:py-10 bg-[#F7F3E8]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-[#5F4B32] mb-4 text-center">
              Independent Bookshop Blog
            </h1>
            <p className="font-sans text-sm md:text-base text-gray-700 text-center mb-8 md:mb-12 leading-relaxed">
              Stories, interviews, and insights from the world of independent bookshops across America.
            </p>
            
            <div className="flex flex-col md:flex-row items-center justify-center text-center md:text-left gap-6 md:gap-10">
              <div className="mb-4 md:mb-0 md:w-1/4 flex justify-center">
                <BookWormMascot />
              </div>
              <div className="md:w-3/4 max-w-xl">
                <blockquote className="italic text-xl md:text-2xl mb-3 text-[#5F4B32] font-serif leading-relaxed">
                  "Better to remain silent and be thought a fool than to speak and remove all doubt."
                </blockquote>
                <p className="font-sans text-[#2A6B7C] font-medium text-base md:text-lg mb-4">
                  — Abraham Lincoln
                </p>
                <p className="font-sans text-sm md:text-base text-gray-700">
                  We're working on some amazing articles about independent bookshops. 
                  Check back soon!
                </p>
              </div>
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
              <Link href="/events" className="block p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow text-center">
                <h3 className="font-serif font-bold text-lg text-[#5F4B32] mb-2">Events</h3>
                <p className="text-sm text-gray-600">Find bookshop events</p>
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
