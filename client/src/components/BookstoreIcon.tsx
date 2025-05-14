import React from 'react';
import { COLORS } from '@/lib/constants';

interface BookstoreIconProps {
  size?: number;
  className?: string;
}

const BookstoreIcon: React.FC<BookstoreIconProps> = ({ size = 150, className = '' }) => {
  // Use secondary color from the theme (teal) for a clean, minimalist look
  const iconColor = COLORS.secondary;
  const bgColor = "#f7f3e8"; // Cream/tan background
  
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Expanded background fill */}
      <rect width="200" height="200" rx="8" fill={bgColor} />
      
      {/* Ultra minimalist book stack - centered in the expanded space */}
      <g fill={iconColor}>
        {/* First book (bottom) */}
        <rect x="45" y="125" width="110" height="25" rx="2" />
        
        {/* Second book */}
        <rect x="50" y="100" width="110" height="25" rx="2" />
        
        {/* Third book */}
        <rect x="55" y="75" width="110" height="25" rx="2" />
        
        {/* Fourth book (top) */}
        <rect x="60" y="50" width="110" height="25" rx="2" />
      </g>
    </svg>
  );
};

export default BookstoreIcon;