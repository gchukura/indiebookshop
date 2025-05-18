import React from 'react';
import { ExternalLink as ExternalLinkIcon } from 'lucide-react';

interface ExternalLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

const ExternalLink = ({ href, children, className = '' }: ExternalLinkProps) => {
  return (
    <a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer" 
      className={`inline-flex items-center ${className}`}
    >
      {children}
      <ExternalLinkIcon className="h-3.5 w-3.5 ml-1" />
    </a>
  );
};

export default ExternalLink;