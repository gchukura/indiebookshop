"use client"

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import SearchBox from "@/components/search/SearchBox";

/**
 * The phone navigation sheet. Header loads it with next/dynamic the first time
 * the menu button is tapped, so Radix Dialog and its scroll lock aren't in
 * every page's JavaScript.
 */
export default function MobileMenu({
  open,
  onOpenChange,
  showBlog,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showBlog: boolean;
}) {
  const close = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[250px] sm:w-[300px] overflow-y-auto">
        <SheetTitle className="sr-only">
          Navigation Menu
        </SheetTitle>
        <SheetDescription className="sr-only">
          Main navigation menu for IndieBookShop.com
        </SheetDescription>
        <div className="mt-8 px-1">
          <SearchBox variant="compact" onNavigate={close} />
        </div>
        <nav className="flex flex-col gap-2 mt-4">
          <Link
            href="/directory"
            className="px-4 py-2 font-sans text-h4 font-semibold hover:bg-gray-100 rounded-md"
            onClick={close}
          >
            Directory
          </Link>
          <Link
            href="/about"
            className="px-4 py-2 font-sans text-h4 font-semibold hover:bg-gray-100 rounded-md"
            onClick={close}
          >
            About
          </Link>
          <Link
            href="/events"
            className="px-4 py-2 font-sans text-h4 font-semibold hover:bg-gray-100 rounded-md"
            onClick={close}
          >
            Events
          </Link>
          {showBlog && (
            <Link
              href="/blog"
              className="px-4 py-2 font-sans text-h4 font-semibold hover:bg-gray-100 rounded-md"
              onClick={close}
            >
              Blog
            </Link>
          )}
          <Link
            href="/contact"
            className="px-4 py-2 font-sans text-h4 font-semibold hover:bg-gray-100 rounded-md"
            onClick={close}
          >
            Contact
          </Link>
          <hr />
          <Link
            href="/submit"
            className="w-full mb-2"
            onClick={close}
          >
            <Button variant="accent" className="w-full min-h-[44px]">
              Add Bookshop
            </Button>
          </Link>
          <Link
            href="/submit-event"
            className="w-full"
            onClick={close}
          >
            <Button className="w-full min-h-[44px]">
              Add Event
            </Button>
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
