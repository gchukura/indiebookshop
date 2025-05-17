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

const Logo = ({ width = 200, height = 60, showDotCom = true, className = "" }: LogoProps & { className?: string }) => {
  // Calculate display dimensions while maintaining proportions
  const originalAspectRatio = 600 / 200; // Increased width to accommodate larger text
  const calculatedWidth = height * originalAspectRatio;
  
  return (
    <div className={`flex items-center overflow-visible ${className}`}>
      <svg 
        width={calculatedWidth} 
        height={height} 
        viewBox="0 0 600 200" 
        xmlns="http://www.w3.org/2000/svg"
        className="mr-2 overflow-visible"
        preserveAspectRatio="xMinYMid meet"
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
        
        {/* Company name with font-weight adjustment for better mobile rendering */}
        <g transform="translate(170, 92)">
          {/* Indie */}
          <text fontFamily="serif" fontWeight="900" fontSize="42" fill={LOGO_COLORS.BLUE} textRendering="geometricPrecision">
            Indie
          </text>
          
          {/* Bookshop */}
          <text x="90" fontFamily="serif" fontWeight="900" fontSize="42" fill={LOGO_COLORS.ORANGE} textRendering="geometricPrecision">
            Bookshop
          </text>
          
          {/* .com */}
          {showDotCom && (
            <text x="270" fontFamily="serif" fontWeight="900" fontSize="28" fill={LOGO_COLORS.GRAY} textRendering="geometricPrecision">
              .com
            </text>
          )}
        </g>
      </svg>
    </div>
  );
};

export default Logo;