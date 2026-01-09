import { Link, useLocation } from "wouter";
import { useState, useMemo, useDeferredValue, startTransition } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Menu, X } from "lucide-react";
import Logo from "@/components/Logo";

const Header = () => {
  const [location] = useLocation();
  const deferredLocation = useDeferredValue(location);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActiveRoute = useMemo(() => {
    return (route: string) => {
      return deferredLocation === route || deferredLocation.startsWith(route + '/');
    };
  }, [deferredLocation]);

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
                className={`${isActiveRoute('/directory') ? 'text-[#2A6B7C] border-b-2 border-[#E16D3D]' : 'text-gray-700 hover:text-[#2A6B7C] hover:border-b-2 hover:border-[#E16D3D]'} font-sans text-body font-semibold px-1 py-2 transition-colors will-change-[transform,opacity]`}
                style={{ willChange: 'transform, opacity' }}
              >
                <span className="pointer-events-none">Directory</span>
              </Link>

              <Link 
                href="/about" 
                className={`${isActiveRoute('/about') ? 'text-[#2A6B7C] border-b-2 border-[#E16D3D]' : 'text-gray-700 hover:text-[#2A6B7C] hover:border-b-2 hover:border-[#E16D3D]'} font-sans text-body font-semibold px-1 py-2 transition-colors will-change-[transform,opacity]`}
                style={{ willChange: 'transform, opacity' }}
              >
                <span className="pointer-events-none">About</span>
              </Link>
              <Link 
                href="/events" 
                className={`${isActiveRoute('/events') ? 'text-[#2A6B7C] border-b-2 border-[#E16D3D]' : 'text-gray-700 hover:text-[#2A6B7C] hover:border-b-2 hover:border-[#E16D3D]'} font-sans text-body font-semibold px-1 py-2 transition-colors will-change-[transform,opacity]`}
                style={{ willChange: 'transform, opacity' }}
              >
                <span className="pointer-events-none">Events</span>
              </Link>
              <Link 
                href="/blog" 
                className={`${isActiveRoute('/blog') ? 'text-[#2A6B7C] border-b-2 border-[#E16D3D]' : 'text-gray-700 hover:text-[#2A6B7C] hover:border-b-2 hover:border-[#E16D3D]'} font-sans text-body font-semibold px-1 py-2 transition-colors will-change-[transform,opacity]`}
                style={{ willChange: 'transform, opacity' }}
              >
                <span className="pointer-events-none">Blog</span>
              </Link>
              <Link 
                href="/contact" 
                className={`${isActiveRoute('/contact') ? 'text-[#2A6B7C] border-b-2 border-[#E16D3D]' : 'text-gray-700 hover:text-[#2A6B7C] hover:border-b-2 hover:border-[#E16D3D]'} font-sans text-body font-semibold px-1 py-2 transition-colors will-change-[transform,opacity]`}
                style={{ willChange: 'transform, opacity' }}
              >
                <span className="pointer-events-none">Contact</span>
              </Link>
            </nav>
          </div>
          <div className="flex items-center space-x-3">
            {/* Only show buttons on desktop */}
            <div className="hidden md:flex space-x-3">
              <Link href="/submit">
                <Button className="bg-[#E16D3D] hover:bg-[#d06a4f] text-white rounded-full min-h-[44px]">
                  Add Bookshop
                </Button>
              </Link>
              <Link href="/submit-event">
                <Button className="bg-[#2A6B7C] hover:bg-[#1d5a6a] text-white rounded-full min-h-[44px]">
                  Add Event
                </Button>
              </Link>
            </div>
            {/* Mobile menu control */}
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="text-gray-500 hover:text-[#2A6B7C]">
                  {isMenuOpen ? (
                    <X className="h-6 w-6" />
                  ) : (
                    <Menu className="h-6 w-6" />
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[250px] sm:w-[300px] overflow-y-auto">
                <SheetTitle className="sr-only">
                  Navigation Menu
                </SheetTitle>
                <SheetDescription className="sr-only">
                  Main navigation menu for IndieBookShop.com
                </SheetDescription>
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
                    <Button className="bg-[#E16D3D] hover:bg-[#d06a4f] text-white w-full rounded-full min-h-[44px]">
                      Add Bookshop
                    </Button>
                  </Link>
                  <Link 
                    href="/submit-event" 
                    className="w-full"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Button className="bg-[#2A6B7C] hover:bg-[#1d5a6a] text-white w-full rounded-full min-h-[44px]">
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
