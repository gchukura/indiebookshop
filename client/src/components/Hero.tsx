import { useState } from "react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

const Hero = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [_, setLocation] = useLocation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/directory?search=${encodeURIComponent(searchQuery)}`);
    }
  };

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
            <form onSubmit={handleSearch} className="relative">
              <Input
                type="text"
                placeholder="Search by city, state, or bookstore name"
                className="w-full px-5 py-6 rounded-full text-dark shadow-md focus:outline-none focus:ring-2 focus:ring-[#E16D3D] text-black"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button 
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-[#E16D3D] hover:bg-[#E16D3D]/90 text-white rounded-full p-2 h-10 w-10"
              >
                <Search className="h-5 w-5" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
