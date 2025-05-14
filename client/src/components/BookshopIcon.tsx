import React from 'react';
import { COLORS } from '@/lib/constants';

interface BookshopIconProps {
  size?: number;
  className?: string;
}

const BookshopIcon: React.FC<BookshopIconProps> = ({ size = 150, className = '' }) => {
  // Inverted colors - fill with teal and use white or cream for outline
  const fillColor = COLORS.secondary; // Teal
  const strokeColor = COLORS.cream;  // Cream for contrast
  
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background for the book */}
      <g fill={fillColor}>
        {/* Book shape */}
        <path d="M40,70 C40,70 70,50 100,50 C130,50 160,70 160,70 L160,140 C160,140 130,120 100,120 C70,120 40,140 40,140 L40,70Z" />
      </g>
      
      {/* Book outline */}
      <g stroke={strokeColor} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
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
      <g stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round">
        <path d="M50,80 L90,73" />
        <path d="M50,90 L90,83" />
        <path d="M50,100 L90,93" />
        <path d="M50,110 L90,103" />
      </g>
      
      {/* Fake text lines - right page */}
      <g stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round">
        <path d="M110,73 L150,80" />
        <path d="M110,83 L150,90" />
        <path d="M110,93 L150,100" />
        <path d="M110,103 L150,110" />
      </g>
    </svg>
  );
};

export default BookshopIcon;