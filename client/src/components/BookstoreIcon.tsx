import React from 'react';
import { COLORS } from '@/lib/constants';

interface BookstoreIconProps {
  size?: number;
  className?: string;
}

const BookstoreIcon: React.FC<BookstoreIconProps> = ({ size = 150, className = '' }) => {
  // Use secondary color from the theme (teal) for a clean, minimalist look
  const iconColor = COLORS.secondary;
  
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background */}
      <rect width="200" height="200" rx="10" fill="#f7f3e8" />
      
      {/* Ultra minimalist book stack */}
      <g fill={iconColor}>
        {/* First book */}
        <rect x="60" y="120" width="80" height="20" rx="2" />
        
        {/* Second book */}
        <rect x="65" y="100" width="80" height="20" rx="2" />
        
        {/* Third book */}
        <rect x="70" y="80" width="80" height="20" rx="2" />
        
        {/* Fourth book */}
        <rect x="75" y="60" width="80" height="20" rx="2" />
      </g>
      
      {/* Store text */}
      <text 
        x="100" 
        y="160" 
        fontFamily="Arial, sans-serif" 
        fontSize="16" 
        fontWeight="bold" 
        fill={iconColor}
        textAnchor="middle"
      >
        BOOKSTORE
      </text>
    </svg>
  );
};

export default BookstoreIcon;