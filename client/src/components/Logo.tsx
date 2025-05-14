import React from 'react';

interface LogoProps {
  width?: number;
  height?: number;
  showDotCom?: boolean;
}

// Logo color constants - matching the SVG and website theme
const COLORS = {
  BLUE: "#3d6a80",     // Dark blue for "Indie" and bottom book
  ORANGE: "#e65c4f",   // Orange-red for "Bookshop" and middle book
  LIGHT_BLUE: "#5d8aa8", // Light blue for top book
  GRAY: "#666666"      // Gray for ".com"
};

const Logo = ({ width = 180, height = 60, showDotCom = true }: LogoProps) => {
  const aspectRatio = 500 / 200; // Original SVG dimensions
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
          <rect x="0" y="70" width="90" height="30" rx="2" ry="2" fill={COLORS.BLUE} />
          
          {/* Middle book */}
          <rect x="5" y="40" width="90" height="30" rx="2" ry="2" fill={COLORS.ORANGE} />
          
          {/* Top book */}
          <rect x="10" y="10" width="90" height="30" rx="2" ry="2" fill={COLORS.LIGHT_BLUE} />
        </g>
        
        {/* Company name */}
        <g transform="translate(165, 87)">
          {/* Indie */}
          <text fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="36" fill={COLORS.BLUE}>
            Indie
          </text>
          
          {/* Bookshop */}
          <text x="85" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="36" fill={COLORS.ORANGE}>
            Bookshop
          </text>
          
          {/* .com */}
          {showDotCom && (
            <text x="260" fontFamily="Arial, sans-serif" fontWeight="normal" fontSize="18" fill={COLORS.GRAY}>
              .com
            </text>
          )}
        </g>
      </svg>
    </div>
  );
};

export default Logo;