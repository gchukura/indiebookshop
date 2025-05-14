import React from 'react';
import { COLORS } from "@/lib/constants";

interface LogoProps {
  width?: number;
  height?: number;
  showDotCom?: boolean;
}

// Logo color constants - matching the website theme
const LOGO_COLORS = {
  BLUE: COLORS.secondary,    // Teal color from site theme for "Indie" and bottom book
  ORANGE: COLORS.accent,     // Orange from site theme for "Bookshop" and middle book
  BROWN: COLORS.primary,     // Brown from site theme for top book
  GRAY: COLORS.dark,         // Dark text color for ".com"
};

const Logo = ({ width = 200, height = 60, showDotCom = true }: LogoProps) => {
  const aspectRatio = 4.5; // Increased aspect ratio for better visibility
  const calculatedWidth = height * aspectRatio;
  
  return (
    <div style={{ width: calculatedWidth, height }} className="flex items-center">
      <svg 
        width={calculatedWidth} 
        height={height} 
        viewBox="0 0 500 200" 
        xmlns="http://www.w3.org/2000/svg"
        className="mr-2"
      >
        {/* Book stack */}
        <g transform="translate(55, 20)">
          {/* Bottom book */}
          <rect x="0" y="70" width="90" height="30" rx="2" ry="2" fill={LOGO_COLORS.BLUE} />
          
          {/* Middle book */}
          <rect x="5" y="40" width="90" height="30" rx="2" ry="2" fill={LOGO_COLORS.ORANGE} />
          
          {/* Top book */}
          <rect x="10" y="10" width="90" height="30" rx="2" ry="2" fill={LOGO_COLORS.BROWN} />
        </g>
        
        {/* Company name */}
        <g transform="translate(165, 87)">
          {/* Indie */}
          <text fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="55" fill={LOGO_COLORS.BLUE}>
            Indie
          </text>
          
          {/* Bookshop */}
          <text x="85" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="55" fill={LOGO_COLORS.ORANGE}>
            Bookshop
          </text>
          
          {/* .com */}
          {showDotCom && (
            <text x="260" fontFamily="Arial, sans-serif" fontWeight="normal" fontSize="28" fill={LOGO_COLORS.GRAY}>
              .com
            </text>
          )}
        </g>
      </svg>
    </div>
  );
};

export default Logo;