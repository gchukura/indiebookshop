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
          Help us grow our comprehensive directory of independent bookshops across America. Submit a new indie bookshop or suggest updates to an existing one.
        </p>
        
        <p className="text-center text-gray-600 mb-8">
          Our mission is to connect readers with local independent bookshops. Your submission helps support the vibrant community of indie bookshops nationwide.
        </p>
        
        <BookshopSubmissionForm />
      </div>
    </div>
  );
};

export default SubmitBookstore;