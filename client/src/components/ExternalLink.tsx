import React from 'react';
import { trackEvent } from '../lib/analytics';

interface ExternalLinkProps {
  href: string;
  className?: string;
  children: React.ReactNode;
  trackingLabel?: string;
}

const ExternalLink: React.FC<ExternalLinkProps> = ({ 
  href, 
  className = '', 
  children, 
  trackingLabel 
}) => {
  // Make sure the link is valid
  const safeHref = href?.startsWith('http') ? href : `https://${href}`;
  
  const handleClick = () => {
    // Track the external link click with Google Analytics
    trackEvent('external_link_click', 'engagement', trackingLabel || safeHref);
  };
  
  return (
    <a 
      href={safeHref} 
      target="_blank" 
      rel="noopener noreferrer" 
      className={className}
      onClick={handleClick}
    >
      {children}
    </a>
  );
};

export default ExternalLink;