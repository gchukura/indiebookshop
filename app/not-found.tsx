import Link from 'next/link';
import { MapPin, Home, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <MapPin className="w-16 h-16 text-[#2A6B7C] mx-auto mb-6" />
        <h1 className="font-serif text-4xl font-bold text-[#5F4B32] mb-4">
          Page Not Found
        </h1>
        <p className="text-gray-600 mb-8">
          We couldn't find the page you're looking for. The bookshop may have moved or the link might be outdated.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild variant="outline" className="flex items-center gap-2">
            <Link href="/directory">
              <Search className="w-4 h-4" />
              Browse Directory
            </Link>
          </Button>
          <Button asChild className="bg-[#2A6B7C] hover:bg-[#1d5a6a]">
            <Link href="/" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              Go home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
