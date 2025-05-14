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
      {/* Extremely minimal open book - just simple lines */}
      <g stroke={iconColor} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        {/* Left page */}
        <path d="M40,140 C40,140 70,120 100,120" />
        
        {/* Right page */}
        <path d="M100,120 C130,120 160,140 160,140" />
        
        {/* Left side */}
        <path d="M40,140 L40,70 C40,70 70,50 100,50" />
        
        {/* Right side */}
        <path d="M100,50 C130,50 160,70 160,70 L160,140" />
        
        {/* Spine */}
        <path d="M100,50 L100,120" />
      </g>
    </svg>
  );
};

export default BookstoreIcon;