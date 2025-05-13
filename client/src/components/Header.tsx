import { Link, useLocation } from "wouter";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X, ChevronDown } from "lucide-react";
import { Feature } from "@shared/schema";

const Header = () => {
  const [location] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showStatesDropdown, setShowStatesDropdown] = useState(false);
  const [showCategoriesDropdown, setShowCategoriesDropdown] = useState(false);
  const statesDropdownRef = useRef<HTMLDivElement>(null);
  const categoriesDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch states for dropdown
  const { data: states = [] } = useQuery<string[]>({
    queryKey: ["/api/states"],
  });

  // Fetch features/categories for dropdown
  const { data: features = [] } = useQuery<Feature[]>({
    queryKey: ["/api/features"],
  });

  // Handle clicks outside the dropdown to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (statesDropdownRef.current && !statesDropdownRef.current.contains(event.target as Node)) {
        setShowStatesDropdown(false);
      }
      if (categoriesDropdownRef.current && !categoriesDropdownRef.current.contains(event.target as Node)) {
        setShowCategoriesDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const isActiveRoute = (route: string) => {
    return location === route || location.startsWith(route + '/');
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <span className="text-[#5F4B32] font-serif text-2xl font-bold">IndiebookShop</span>
            </Link>
            <nav className="hidden md:ml-10 md:flex md:space-x-8">
              <Link 
                href="/directory/browse" 
                className={`${isActiveRoute('/directory') ? 'text-[#5F4B32] border-b-2 border-[#E16D3D]' : 'text-[#333333] hover:text-[#5F4B32]'} font-medium px-1 py-2`}
              >
                Directory
              </Link>

              <Link 
                href="/about" 
                className={`${isActiveRoute('/about') ? 'text-[#5F4B32] border-b-2 border-[#E16D3D]' : 'text-[#333333] hover:text-[#5F4B32]'} font-medium px-1 py-2`}
              >
                About
              </Link>
              <Link 
                href="/events" 
                className={`${isActiveRoute('/events') ? 'text-[#5F4B32] border-b-2 border-[#E16D3D]' : 'text-[#333333] hover:text-[#5F4B32]'} font-medium px-1 py-2`}
              >
                Events
              </Link>
              <Link 
                href="/blog" 
                className={`${isActiveRoute('/blog') ? 'text-[#5F4B32] border-b-2 border-[#E16D3D]' : 'text-[#333333] hover:text-[#5F4B32]'} font-medium px-1 py-2`}
              >
                Blog
              </Link>
            </nav>
          </div>
          <div className="flex items-center space-x-3">
            <Link href="/submit">
              <Button className="bg-[#E16D3D] hover:bg-[#E16D3D]/90 text-white">
                <span className="hidden md:inline">Add Your Bookstore</span>
                <span className="md:hidden">Add Bookstore</span>
              </Button>
            </Link>
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="text-gray-500 hover:text-[#5F4B32]">
                  {isMenuOpen ? (
                    <X className="h-6 w-6" />
                  ) : (
                    <Menu className="h-6 w-6" />
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[250px] sm:w-[300px] overflow-y-auto">
                <nav className="flex flex-col gap-2 mt-8">
                  <Link 
                    href="/directory/browse" 
                    className="px-4 py-2 text-lg font-medium hover:bg-gray-100 rounded-md"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Directory
                  </Link>
                  
                  <Link 
                    href="/about" 
                    className="px-4 py-2 text-lg font-medium hover:bg-gray-100 rounded-md"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    About
                  </Link>
                  <Link 
                    href="/events" 
                    className="px-4 py-2 text-lg font-medium hover:bg-gray-100 rounded-md"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Events
                  </Link>
                  <Link 
                    href="/blog" 
                    className="px-4 py-2 text-lg font-medium hover:bg-gray-100 rounded-md"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Blog
                  </Link>
                  <hr />
                  <Link 
                    href="/submit" 
                    className="w-full"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Button className="bg-[#E16D3D] hover:bg-[#E16D3D]/90 text-white w-full">
                      Add Your Bookstore
                    </Button>
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
