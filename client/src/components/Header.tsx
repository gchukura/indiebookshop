import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X } from "lucide-react";
import Logo from "@/components/Logo";

const Header = () => {
  const [location] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActiveRoute = (route: string) => {
    return location === route || location.startsWith(route + '/');
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 md:h-24">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <Logo height={90} width={90} className="md:h-[80px] md:w-auto" showDotCom={true} />
            </Link>
            <nav className="hidden md:ml-10 md:flex md:space-x-8">
              <Link 
                href="/directory" 
                className={`${isActiveRoute('/directory') ? 'text-[#5F4B32] border-b-2 border-[#E16D3D]' : 'text-[#333333] hover:text-[#5F4B32]'} font-sans text-body font-semibold px-1 py-2`}
              >
                Directory
              </Link>

              <Link 
                href="/about" 
                className={`${isActiveRoute('/about') ? 'text-[#5F4B32] border-b-2 border-[#E16D3D]' : 'text-[#333333] hover:text-[#5F4B32]'} font-sans text-body font-semibold px-1 py-2`}
              >
                About
              </Link>
              <Link 
                href="/events" 
                className={`${isActiveRoute('/events') ? 'text-[#5F4B32] border-b-2 border-[#E16D3D]' : 'text-[#333333] hover:text-[#5F4B32]'} font-sans text-body font-semibold px-1 py-2`}
              >
                Events
              </Link>
              <Link 
                href="/blog" 
                className={`${isActiveRoute('/blog') ? 'text-[#5F4B32] border-b-2 border-[#E16D3D]' : 'text-[#333333] hover:text-[#5F4B32]'} font-sans text-body font-semibold px-1 py-2`}
              >
                Blog
              </Link>
              <Link 
                href="/contact" 
                className={`${isActiveRoute('/contact') ? 'text-[#5F4B32] border-b-2 border-[#E16D3D]' : 'text-[#333333] hover:text-[#5F4B32]'} font-sans text-body font-semibold px-1 py-2`}
              >
                Contact
              </Link>
            </nav>
          </div>
          <div className="flex items-center space-x-3">
            {/* Only show buttons on desktop */}
            <div className="hidden md:flex space-x-3">
              <Link href="/submit">
                <Button className="bg-[#E16D3D] hover:bg-[#E16D3D]/90 text-white">
                  Add Bookshop
                </Button>
              </Link>
              <Link href="/submit-event">
                <Button className="bg-[#4A7C59] hover:bg-[#4A7C59]/90 text-white">
                  Add Event
                </Button>
              </Link>
            </div>
            {/* Mobile menu control */}
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
                    href="/directory" 
                    className="px-4 py-2 font-sans text-h4 font-semibold hover:bg-gray-100 rounded-md"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Directory
                  </Link>
                  
                  <Link 
                    href="/about" 
                    className="px-4 py-2 font-sans text-h4 font-semibold hover:bg-gray-100 rounded-md"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    About
                  </Link>
                  <Link 
                    href="/events" 
                    className="px-4 py-2 font-sans text-h4 font-semibold hover:bg-gray-100 rounded-md"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Events
                  </Link>
                  <Link 
                    href="/blog" 
                    className="px-4 py-2 font-sans text-h4 font-semibold hover:bg-gray-100 rounded-md"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Blog
                  </Link>
                  <Link 
                    href="/contact" 
                    className="px-4 py-2 font-sans text-h4 font-semibold hover:bg-gray-100 rounded-md"
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
                      Add Bookshop
                    </Button>
                  </Link>
                  <Link 
                    href="/submit-event" 
                    className="w-full"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Button className="bg-[#4A7C59] hover:bg-[#4A7C59]/90 text-white w-full">
                      Add Event
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
