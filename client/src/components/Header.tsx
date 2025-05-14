import { Link, useLocation } from "wouter";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X, ChevronDown } from "lucide-react";
import { Feature } from "@shared/schema";
import Logo from "@/components/Logo";

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
        <div className="flex justify-between h-32">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <Logo height={120} showDotCom={true} />
            </Link>
            <nav className="hidden md:ml-10 md:flex md:space-x-8">
              <div className="relative" ref={statesDropdownRef}>
                <button 
                  onClick={() => {
                    setShowStatesDropdown(!showStatesDropdown);
                    setShowCategoriesDropdown(false);
                  }}
                  className={`${isActiveRoute('/directory') ? 'text-[#5F4B32] border-b-2 border-[#E16D3D]' : 'text-[#333333] hover:text-[#5F4B32]'} font-medium px-1 py-2 flex items-center`}
                >
                  Directory
                  <ChevronDown className="ml-1 h-4 w-4" />
                </button>
                {showStatesDropdown && (
                  <div className="absolute top-12 left-0 bg-white shadow-lg rounded-md overflow-hidden w-64 z-50">
                    <div className="py-1">
                      <Link 
                        href="/directory" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setShowStatesDropdown(false)}
                      >
                        All Bookshops
                      </Link>
                      <Link 
                        href="/directory/browse" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setShowStatesDropdown(false)}
                      >
                        Bookshops by State
                      </Link>
                      <Link 
                        href="/directory/cities" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setShowStatesDropdown(false)}
                      >
                        Bookshops by City
                      </Link>
                      <Link 
                        href="/directory/categories" 
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setShowStatesDropdown(false)}
                      >
                        Bookshops by Category
                      </Link>
                    </div>
                  </div>
                )}
              </div>

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
              <Link 
                href="/contact" 
                className={`${isActiveRoute('/contact') ? 'text-[#5F4B32] border-b-2 border-[#E16D3D]' : 'text-[#333333] hover:text-[#5F4B32]'} font-medium px-1 py-2`}
              >
                Contact
              </Link>
            </nav>
          </div>
          <div className="flex items-center space-x-3">
            <Link href="/submit">
              <Button className="bg-[#E16D3D] hover:bg-[#E16D3D]/90 text-white">
                <span className="hidden md:inline">Add a Bookshop</span>
                <span className="md:hidden">Add Bookshop</span>
              </Button>
            </Link>
            <Link href="/submit-event">
              <Button className="bg-[#4A7C59] hover:bg-[#4A7C59]/90 text-white">
                <span className="hidden md:inline">Add an Event</span>
                <span className="md:hidden">Add Event</span>
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
                  <div className="space-y-2">
                    <div className="px-4 py-2 text-lg font-medium text-[#5F4B32]">
                      Directory
                    </div>
                    <div className="pl-4 space-y-1">
                      <Link 
                        href="/directory" 
                        className="block px-4 py-1.5 text-md text-gray-700 hover:bg-gray-100 rounded"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        All Bookshops
                      </Link>
                      <Link 
                        href="/directory/browse" 
                        className="block px-4 py-1.5 text-md text-gray-700 hover:bg-gray-100 rounded"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Bookshops by State
                      </Link>
                      <Link 
                        href="/directory/cities" 
                        className="block px-4 py-1.5 text-md text-gray-700 hover:bg-gray-100 rounded"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Bookshops by City
                      </Link>
                      <Link 
                        href="/directory/categories" 
                        className="block px-4 py-1.5 text-md text-gray-700 hover:bg-gray-100 rounded"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Bookshops by Category
                      </Link>
                    </div>
                  </div>
                  
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
                  <Link 
                    href="/contact" 
                    className="px-4 py-2 text-lg font-medium hover:bg-gray-100 rounded-md"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Contact
                  </Link>
                  <hr />
                  <Link 
                    href="/submit" 
                    className="w-full mb-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Button className="bg-[#E16D3D] hover:bg-[#E16D3D]/90 text-white w-full">
                      Add a Bookshop
                    </Button>
                  </Link>
                  <Link 
                    href="/submit-event" 
                    className="w-full"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Button className="bg-[#4A7C59] hover:bg-[#4A7C59]/90 text-white w-full">
                      Add an Event
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
