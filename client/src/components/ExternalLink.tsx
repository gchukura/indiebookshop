import React from 'react';

interface ExternalLinkProps {
  href: string;
  className?: string;
  children: React.ReactNode;
}

const ExternalLink: React.FC<ExternalLinkProps> = ({ href, className = '', children }) => {
  // Make sure the link is valid
  const safeHref = href?.startsWith('http') ? href : `https://${href}`;
  
  return (
    <a 
      href={safeHref} 
      target="_blank" 
      rel="noopener noreferrer" 
      className={className}
    >
      {children}
    </a>
  );
};

export default ExternalLink;