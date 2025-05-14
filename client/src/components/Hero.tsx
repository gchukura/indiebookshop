import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

const Hero = () => {
  const [_, setLocation] = useLocation();

  return (
    <section className="bg-[#5F4B32] text-white py-12 md:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold mb-4">
            Discover Independent Bookstores
          </h1>
          <p className="text-lg md:text-xl opacity-90 mb-8">
            Explore unique bookshops across the United States and find your next literary haven.
          </p>
          <div className="max-w-xl mx-auto">
            <Button 
              onClick={() => setLocation('/directory')}
              className="bg-[#E16D3D] hover:bg-[#E16D3D]/90 text-white rounded-full px-8 py-6 text-lg"
            >
              Find Bookstores
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
