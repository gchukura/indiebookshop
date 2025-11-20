import { FC, useMemo } from "react";
import BookshopSubmissionForm from "../components/BookstoreSubmissionForm";
import { SEO } from "../components/SEO";
import { BASE_URL } from "../lib/seo";

const SubmitBookstore: FC = () => {
  // SEO metadata
  const seoTitle = useMemo(() => {
    return "Submit a Bookshop | Add to Our Independent Bookshop Directory";
  }, []);
  
  const seoDescription = useMemo(() => {
    return "Help grow our directory of independent bookshops across America. Submit a new indie bookshop or suggest updates to an existing one to improve our free bookshop finder service.";
  }, []);
  
  const seoKeywords = useMemo(() => {
    return [
      "submit bookshop",
      "add bookshop to directory",
      "independent bookshop listing",
      "indie bookshop submission",
      "register bookshop",
      "add indie bookshop information",
      "bookshop directory submission",
      "list my bookshop",
      "update bookshop listing",
      "indie bookshop registration"
    ];
  }, []);
  
  const canonicalUrl = useMemo(() => {
    return `${BASE_URL}/submit-bookstore`;
  }, []);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* SEO Component */}
      <SEO 
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        canonicalUrl={canonicalUrl}
      />
      
      <div className="max-w-3xl mx-auto mb-12">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif font-bold text-[#5F4B32] mb-4">
          Submit an Independent Bookshop
        </h1>
        
        <p className="text-lg md:text-xl text-gray-600 mb-4">
          Help us grow our comprehensive directory of independent bookshops across America. Submit a new indie bookshop or suggest updates to an existing one.
        </p>
        
        <p className="text-lg md:text-xl text-gray-600 mb-8">
          Our mission is to connect readers with local independent bookshops. Your submission helps support the vibrant community of indie bookshops nationwide.
        </p>
        
        <BookshopSubmissionForm />
      </div>
    </div>
  );
};

export default SubmitBookstore;