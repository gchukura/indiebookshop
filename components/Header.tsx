"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Menu, Search, X } from "lucide-react";
import SearchBox from "@/components/search/SearchBox";
import Logo from "@/components/Logo";

const MobileMenu = dynamic(() => import("@/components/MobileMenu"), { ssr: false });

// Optimized NavLink component - uses Next.js Link for efficient navigation
const NavLink = ({ href, children, className, isActive }: { href: string; children: React.ReactNode; className?: string; isActive: boolean }) => {
  return (
    <Link
      href={href}
      className={className}
      aria-current={isActive ? 'page' : undefined}
    >
      {children}
    </Link>
  );
};

/** `showBlog` is false when content/blog has no posts, so the nav doesn't link to an empty page. */
const Header = ({ showBlog = true }: { showBlog?: boolean }) => {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuLoaded, setMenuLoaded] = useState(false);

  // Pre-compute all active states in a single useMemo to avoid function calls during render
  const activeRoutes = useMemo(() => {
    const routes = ['/directory', '/about', '/events', '/blog', '/contact'];
    const active: Record<string, boolean> = {};
    routes.forEach(route => {
      active[route] = pathname === route || pathname.startsWith(route + '/');
    });
    return active;
  }, [pathname]);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container-site">
        <div className="flex justify-between h-14 md:h-24">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center min-h-[44px]">
              <span className="sr-only">IndieBookShop home</span>
              {/* The logo sizes itself with inline styles, so render one per breakpoint */}
              <Logo height={40} tight className="md:hidden" showDotCom={true} />
              <Logo height={80} className="hidden md:flex" showDotCom={true} />
            </Link>
            <nav className="hidden md:ml-10 md:flex md:space-x-8">
              <NavLink
                href="/directory"
                isActive={activeRoutes['/directory']}
                className={activeRoutes['/directory'] ? 'text-brand-teal border-b-2 border-brand-orange font-sans text-body font-semibold px-1 py-2 transition-colors' : 'text-gray-700 hover:text-brand-teal hover:border-b-2 hover:border-brand-orange font-sans text-body font-semibold px-1 py-2 transition-colors'}
              >
                <span className="pointer-events-none">Directory</span>
              </NavLink>

              <NavLink
                href="/about"
                isActive={activeRoutes['/about']}
                className={activeRoutes['/about'] ? 'text-brand-teal border-b-2 border-brand-orange font-sans text-body font-semibold px-1 py-2 transition-colors' : 'text-gray-700 hover:text-brand-teal hover:border-b-2 hover:border-brand-orange font-sans text-body font-semibold px-1 py-2 transition-colors'}
              >
                <span className="pointer-events-none">About</span>
              </NavLink>
              <NavLink
                href="/events"
                isActive={activeRoutes['/events']}
                className={activeRoutes['/events'] ? 'text-brand-teal border-b-2 border-brand-orange font-sans text-body font-semibold px-1 py-2 transition-colors' : 'text-gray-700 hover:text-brand-teal hover:border-b-2 hover:border-brand-orange font-sans text-body font-semibold px-1 py-2 transition-colors'}
              >
                <span className="pointer-events-none">Events</span>
              </NavLink>
              {showBlog && (
                <NavLink
                  href="/blog"
                  isActive={activeRoutes['/blog']}
                  className={activeRoutes['/blog'] ? 'text-brand-teal border-b-2 border-brand-orange font-sans text-body font-semibold px-1 py-2 transition-colors' : 'text-gray-700 hover:text-brand-teal hover:border-b-2 hover:border-brand-orange font-sans text-body font-semibold px-1 py-2 transition-colors'}
                >
                  <span className="pointer-events-none">Blog</span>
                </NavLink>
              )}
              <NavLink
                href="/contact"
                isActive={activeRoutes['/contact']}
                className={activeRoutes['/contact'] ? 'text-brand-teal border-b-2 border-brand-orange font-sans text-body font-semibold px-1 py-2 transition-colors' : 'text-gray-700 hover:text-brand-teal hover:border-b-2 hover:border-brand-orange font-sans text-body font-semibold px-1 py-2 transition-colors'}
              >
                <span className="pointer-events-none">Contact</span>
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center space-x-1 md:space-x-3">
            {/* Search: inline on wide screens, an icon on phones and tablets (also in the phone menu) */}
            <div className="hidden lg:block w-56 xl:w-64">
              <SearchBox variant="compact" />
            </div>
            <Link
              href="/search"
              aria-label="Search bookshops"
              className="flex lg:hidden items-center justify-center w-11 h-11 rounded-full text-gray-600 hover:text-brand-teal hover:bg-gray-100"
            >
              <Search className="w-5 h-5" aria-hidden="true" />
            </Link>
            {/* Only show buttons on desktop */}
            <div className="hidden md:flex space-x-3">
              <Link href="/submit">
                <Button variant="accent" className="min-h-[44px]">
                  Add Bookshop
                </Button>
              </Link>
              <Link href="/submit-event">
                <Button className="min-h-[44px]">
                  Add Event
                </Button>
              </Link>
            </div>
            {/* Mobile menu: the sheet's code loads on the first tap (or press) */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-11 w-11 text-gray-500 hover:text-brand-teal"
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              aria-haspopup="dialog"
              aria-expanded={isMenuOpen}
              onPointerDown={() => setMenuLoaded(true)}
              onClick={() => {
                setMenuLoaded(true);
                setIsMenuOpen(open => !open);
              }}
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
            {menuLoaded && <MobileMenu open={isMenuOpen} onOpenChange={setIsMenuOpen} showBlog={showBlog} />}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
