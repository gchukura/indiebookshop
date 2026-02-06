'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, Home, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <AlertCircle className="w-16 h-16 text-[#E16D3D] mx-auto mb-6" />
        <h1 className="font-serif text-3xl font-bold text-[#5F4B32] mb-4">
          Something went wrong
        </h1>
        <p className="text-gray-600 mb-8">
          We apologize for the inconvenience. Please try again or return to the homepage.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={reset}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Try again
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
