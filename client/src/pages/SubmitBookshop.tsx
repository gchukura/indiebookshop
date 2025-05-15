import { FC, useMemo } from "react";
import BookshopSubmissionForm from "../components/BookshopSubmissionForm";
import { SEO } from "../components/SEO";
import { BASE_URL } from "../lib/seo";

const SubmitBookshop: FC = () => {
  // SEO metadata
  const seoTitle = useMemo(() => {
    return "Submit a Bookshop | Add to Our Independent Bookstore Directory";
  }, []);
  
  const seoDescription = useMemo(() => {
    return "Help grow our directory of independent bookshops across America. Submit a new indie bookstore or suggest updates to an existing one to improve our free bookshop finder service.";
  }, []);
  
  const seoKeywords = useMemo(() => {
    return [
      "submit bookshop",
      "add bookstore to directory",
      "independent bookshop listing",
      "indie bookstore submission",
      "register bookshop",
      "add bookstore information",
      "bookshop directory submission",
      "list my bookstore",
      "update bookshop listing",
      "indie bookshop registration"
    ];
  }, []);
  
  const canonicalUrl = useMemo(() => {
    return `${BASE_URL}/submit-bookshop`;
  }, []);

  return (
    <div className="container py-8 md:py-12">
      {/* SEO Component */}
      <SEO 
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        canonicalUrl={canonicalUrl}
      />
      
      <div className="max-w-3xl mx-auto mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-4 text-center text-[#5F4B32] font-serif">
          Submit an Independent Bookshop
        </h1>
        
        <p className="text-center text-gray-600 mb-4">
          Help us grow our directory of independent bookshops across America. Submit a new bookshop or suggest updates to an existing one.
        </p>
        
        <p className="text-center text-gray-600 mb-8">
          Our mission is to connect readers with local independent bookstores. Your submission helps support the vibrant community of indie bookshops nationwide.
        </p>
        
        <BookshopSubmissionForm />
      </div>
    </div>
  );
};

export default SubmitBookshop;