import React from 'react';
import { COLORS } from '@/lib/constants';

interface BookstoreIconProps {
  size?: number;
  className?: string;
}

const BookstoreIcon: React.FC<BookstoreIconProps> = ({ size = 150, className = '' }) => {
  // Use secondary color from the theme (teal) for a clean, minimalist look
  const iconColor = COLORS.secondary;
  const textLineColor = `${iconColor}40`; // 25% opacity version of the icon color
  
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Book outline */}
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
      
      {/* Fake text lines - left page */}
      <g stroke={textLineColor} strokeWidth="2" strokeLinecap="round">
        <path d="M50,80 L90,73" />
        <path d="M50,90 L90,83" />
        <path d="M50,100 L90,93" />
        <path d="M50,110 L90,103" />
      </g>
      
      {/* Fake text lines - right page */}
      <g stroke={textLineColor} strokeWidth="2" strokeLinecap="round">
        <path d="M110,73 L150,80" />
        <path d="M110,83 L150,90" />
        <path d="M110,93 L150,100" />
        <path d="M110,103 L150,110" />
      </g>
    </svg>
  );
};

export default BookstoreIcon;