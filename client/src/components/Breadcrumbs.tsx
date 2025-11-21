import React from 'react';
import { Link } from 'wouter';
import { ChevronRight } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export type BreadcrumbItem = {
  label: string;
  href: string;
  isCurrent?: boolean;
};

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * A breadcrumb navigation component that includes structured data for SEO
 * 
 * @param items Array of breadcrumb items with label and href
 * @param className Optional additional CSS classes
 */
const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ 
  items, 
  className = '' 
}) => {
  if (!items || items.length === 0) return null;
  
  // Generate structured data
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': items.map((item, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'item': {
        '@id': item.href,
        'name': item.label
      }
    }))
  };
  
  return (
    <>
      {/* Structured data for SEO - injected into <head> via Helmet */}
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>
      
      {/* Visual breadcrumb component */}
      <nav aria-label="Breadcrumbs" className={`text-sm ${className}`}>
        <ol className="flex flex-wrap items-center space-x-1 md:space-x-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 mx-1 text-gray-400" aria-hidden="true" />
            )}
            
            {item.isCurrent ? (
              <span className="text-gray-500 font-medium truncate max-w-[150px]" aria-current="page">
                {item.label}
              </span>
            ) : (
              <Link 
                to={item.href} 
                className="text-blue-600 hover:text-blue-800 hover:underline truncate max-w-[150px]"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
        </ol>
      </nav>
    </>
  );
};

export default Breadcrumbs;