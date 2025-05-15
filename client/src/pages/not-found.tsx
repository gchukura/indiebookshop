import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, BookOpen, Home, Search, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { SEO } from "../components/SEO";
import { BASE_URL } from "../lib/seo";

export default function NotFound() {
  const [_, navigate] = useLocation();
  
  // SEO metadata
  const seoTitle = useMemo(() => {
    return "Page Not Found | IndieBookShop.com";
  }, []);
  
  const seoDescription = useMemo(() => {
    return "We couldn't find the page you were looking for. Please browse our independent bookshop directory or search for bookshops by location, category, or name.";
  }, []);
  
  const canonicalUrl = useMemo(() => {
    return `${BASE_URL}/404`;
  }, []);
  
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F7F3E8] py-10">
      {/* SEO Component */}
      <SEO 
        title={seoTitle}
        description={seoDescription}
        canonicalUrl={canonicalUrl}
      />
      
      <Card className="w-full max-w-lg mx-4 shadow-md border-0">
        <CardContent className="pt-8 pb-8 px-6">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <BookOpen className="h-14 w-14 text-[#2A6B7C]" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-[#5F4B32] mb-2">
              Page Not Found
            </h1>
            <p className="text-gray-600 mb-6">
              We couldn't find the page you were looking for in our independent bookshop directory.
            </p>
          </div>
          
          <div className="space-y-4">
            <p className="text-[#2A6B7C] font-medium">Here are some helpful places to go next:</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <Button 
                className="bg-[#2A6B7C] hover:bg-[#235A69] text-white flex items-center justify-center gap-2 h-12"
                onClick={() => navigate("/")}
              >
                <Home className="h-4 w-4" /> 
                Return to Homepage
              </Button>
              
              <Button 
                className="bg-[#E16D3D] hover:bg-[#C25A33] text-white flex items-center justify-center gap-2 h-12"
                onClick={() => navigate("/directory")}
              >
                <Search className="h-4 w-4" /> 
                Browse Bookshop Directory
              </Button>
              
              <Button 
                className="bg-white border border-[#2A6B7C] text-[#2A6B7C] hover:bg-[#F0F7F9] flex items-center justify-center gap-2 h-12"
                onClick={() => navigate("/states")}
              >
                <MapPin className="h-4 w-4" /> 
                Find Bookshops by State
              </Button>
              
              <Button 
                className="bg-white border border-[#E16D3D] text-[#E16D3D] hover:bg-[#FDF6F3] flex items-center justify-center gap-2 h-12"
                onClick={() => navigate("/categories")}
              >
                <BookOpen className="h-4 w-4" /> 
                Browse by Category
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
