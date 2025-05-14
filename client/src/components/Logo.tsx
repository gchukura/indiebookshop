import React from 'react';
import { COLORS } from "@/lib/constants";

interface LogoProps {
  width?: number;
  height?: number;
  showDotCom?: boolean;
}

// Logo color constants - matching the website theme
const LOGO_COLORS = {
  BLUE: COLORS.secondary,      // Teal color from site theme
  ORANGE: COLORS.accent,       // Orange from site theme
  BROWN: COLORS.primary,       // Brown from site theme
  GRAY: COLORS.dark,           // Dark text color
};

const Logo = ({ width = 200, height = 60, showDotCom = true }: LogoProps) => {
  // Calculate display dimensions while maintaining proportions
  const originalAspectRatio = 600 / 200; // Increased width to accommodate larger text
  const calculatedWidth = height * originalAspectRatio;
  
  // Scale factor for fonts and positioning - keeps original SVG proportions
  const scaleFactor = height / 60;
  
  return (
    <div style={{ width: calculatedWidth, height }} className="flex items-center">
      <svg 
        width={calculatedWidth} 
        height={height} 
        viewBox="0 0 600 200" 
        xmlns="http://www.w3.org/2000/svg"
        className="mr-2"
      >
        {/* Book stack - keeping original proportions */}
        <g transform="translate(55, 20)">
          {/* Bottom book */}
          <rect x="0" y="70" width="90" height="30" rx="2" ry="2" fill={LOGO_COLORS.BLUE} />
          
          {/* Middle book */}
          <rect x="5" y="40" width="90" height="30" rx="2" ry="2" fill={LOGO_COLORS.ORANGE} />
          
          {/* Top book */}
          <rect x="10" y="10" width="90" height="30" rx="2" ry="2" fill={LOGO_COLORS.BROWN} />
        </g>
        
        {/* Company name - adjusted positioning for larger text */}
        <g transform="translate(155, 92)">
          {/* Indie */}
          <text fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="44" fill={LOGO_COLORS.BLUE}>
            Indie
          </text>
          
          {/* Bookshop */}
          <text x="105" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="44" fill={LOGO_COLORS.ORANGE}>
            Bookshop
          </text>
          
          {/* .com */}
          {showDotCom && (
            <text x="320" fontFamily="Arial, sans-serif" fontWeight="normal" fontSize="22" fill={LOGO_COLORS.GRAY}>
              .com
            </text>
          )}
        </g>
      </svg>
    </div>
  );
};

export default Logo;