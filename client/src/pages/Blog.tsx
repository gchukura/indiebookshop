import React from "react";
import { Book } from "lucide-react";

const BlogPlaceholder = () => {
  return (
    <div className="flex flex-col md:flex-row items-center justify-center py-16 px-4 bg-[#F7F3E8] rounded-lg text-center md:text-left gap-10">
      <div className="mb-6 md:mb-0 md:w-1/4 flex justify-center">
        <BookWormMascot />
      </div>
      <div className="md:w-3/4 max-w-xl">
        <blockquote className="italic text-2xl md:text-3xl mb-4 text-[#5F4B32] font-serif leading-relaxed">
          "Better to remain silent and be thought a fool than to speak and remove all doubt."
        </blockquote>
        <p className="text-[#2A6B7C] font-medium text-lg">— Abraham Lincoln</p>
        <p className="mt-6 text-gray-600">
          We're working on some amazing articles about independent bookshops. 
          Check back soon!
        </p>
      </div>
    </div>
  );
};

// Cartoonish Book Worm Mascot component
const BookWormMascot = () => {
  return (
    <div className="relative w-40 h-40 transform scale-90">
      {/* Worm body */}
      <div className="relative">
        {/* Worm head */}
        <div className="w-28 h-28 bg-[#7AB87A] rounded-full relative">
          {/* Eyes */}
          <div className="absolute top-7 left-5 w-5 h-5 bg-white rounded-full">
            <div className="absolute top-1 left-1 w-2.5 h-2.5 bg-black rounded-full"></div>
          </div>
          <div className="absolute top-7 right-5 w-5 h-5 bg-white rounded-full">
            <div className="absolute top-1 left-1 w-2.5 h-2.5 bg-black rounded-full"></div>
          </div>
          
          {/* Smile */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-14 h-5 border-b-3 border-black rounded-b-full"></div>
          
          {/* Reading glasses */}
          <div className="absolute top-7 left-1/2 transform -translate-x-1/2 w-20 h-1.5 bg-[#B85C38]"></div>
          <div className="absolute top-5 left-4 w-7 h-7 border-2 border-[#B85C38] rounded-full"></div>
          <div className="absolute top-5 right-4 w-7 h-7 border-2 border-[#B85C38] rounded-full"></div>
        </div>
        
        {/* Worm body segments */}
        <div className="w-20 h-20 bg-[#8BC48B] rounded-full absolute -bottom-6 left-4"></div>
        <div className="w-16 h-16 bg-[#9BD09B] rounded-full absolute -bottom-12 left-10"></div>
        
        {/* Books that the worm is reading */}
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

const Blog = () => {
  // Mock data for future blog articles
  const placeholderArticles = [
    {
      id: 1,
      title: "The Magic of Independent Bookshops",
      excerpt: "Discover why indie bookshops create unique reading experiences in a digital age.",
      imageUrl: ""
    },
    {
      id: 2,
      title: "5 Hidden Literary Gems in Small Towns",
      excerpt: "These charming bookshops in unexpected locations are worth the journey for any book lover.",
      imageUrl: ""
    },
    {
      id: 3,
      title: "How Bookshop Cats Became a Tradition",
      excerpt: "The delightful history behind the feline residents of your favorite indie bookshops.",
      imageUrl: ""
    },
    {
      id: 4,
      title: "Author Events: The Heart of Indie Bookshops",
      excerpt: "Why face-to-face interactions between writers and readers matter more than ever.",
      imageUrl: ""
    }
  ];

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-[#5F4B32] mb-4">
          Bookshop Blog
        </h1>
        <p className="text-gray-600 mb-8">
          Stories, interviews, and insights from the world of independent bookshops.
        </p>
        
        {/* Placeholder with mascot while no articles exist */}
        <BlogPlaceholder />
        
        {/* Future article grid */}
        <div className="hidden grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
          {placeholderArticles.map(article => (
            <div key={article.id} className="bg-white rounded-lg shadow-sm overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-md">
              <div className="h-48 bg-gray-200 flex justify-center items-center">
                {article.imageUrl ? (
                  <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover" />
                ) : (
                  <Book className="h-12 w-12 text-gray-400" />
                )}
              </div>
              <div className="p-4">
                <h3 className="font-serif font-bold text-lg mb-2 text-[#5F4B32]">{article.title}</h3>
                <p className="text-gray-600 text-sm">{article.excerpt}</p>
                <button className="mt-4 text-[#2A6B7C] font-medium text-sm hover:text-[#E16D3D] transition-colors">
                  Read more →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Blog;