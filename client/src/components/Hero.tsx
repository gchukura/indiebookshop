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
    <section className="bg-[#5F4B32] text-white py-12 md:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold mb-4">
            A niche independent bookshop directory
          </h1>
          <p className="text-lg md:text-xl opacity-90 mb-8">
            Explore unique bookshops across the United States and other regions. Similar to the shops in our directory we are independent and focused on serving the independent bookshop community.
          </p>
          <div className="max-w-xl mx-auto flex flex-col sm:flex-row justify-center gap-4">
            <Button 
              onClick={handleFindBookshops}
              className="bg-[#E16D3D] hover:bg-[#E16D3D]/90 text-white rounded-full px-8 py-6 text-lg"
            >
              Find Bookshops
            </Button>
            <Button 
              onClick={handleAddBookshop}
              className="bg-[#2A6B7C] hover:bg-[#2A6B7C]/90 text-white rounded-full px-8 py-6 text-lg"
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
