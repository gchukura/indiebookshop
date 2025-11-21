import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

const Hero = () => {
  const [_, navigate] = useLocation();

  const handleFindBookshops = () => {
    navigate('/directory');
  };
  
  const handleAddBookshop = () => {
    navigate('/submit');
  };

  return (
    <section className="bg-[#5F4B32] py-12 md:py-20 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="font-serif text-3xl md:text-4xl lg:text-display font-bold text-white mb-4 md:mb-6">
            A niche independent bookshop directory
          </h1>
          <p className="font-sans text-base md:text-body-lg text-gray-100 mb-6 md:mb-10 max-w-4xl mx-auto px-2">
            Explore unique bookshops across the United States and other regions. Similar to the shops in our directory we are independent and focused on serving the independent bookshop community.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full sm:w-auto">
            <Button 
              onClick={handleFindBookshops}
              className="bg-[#E16D3D] hover:bg-[#d06a4f] text-white rounded-full px-6 md:px-8 py-3 md:py-4 w-full sm:w-auto sm:min-w-[180px] min-h-[44px] md:min-h-0 text-base md:text-sm"
            >
              Find Bookshops
            </Button>
            <Button 
              onClick={handleAddBookshop}
              className="bg-[#2A6B7C] hover:bg-[#1d5a6a] text-white rounded-full px-6 md:px-8 py-3 md:py-4 w-full sm:w-auto sm:min-w-[180px] min-h-[44px] md:min-h-0 text-base md:text-sm"
            >
              Add Bookshop
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
