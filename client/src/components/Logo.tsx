import React from 'react';
import { COLORS } from "@/lib/constants";

interface LogoProps {
  width?: number;
  height?: number;
  showDotCom?: boolean;
  className?: string;
}

// Logo color constants - matching the website theme
const LOGO_COLORS = {
  BLUE: COLORS.secondary,      // Teal color from site theme
  ORANGE: COLORS.accent,       // Orange from site theme
  BROWN: COLORS.primary,       // Brown from site theme
  GRAY: COLORS.dark,           // Dark text color
};

const Logo = ({ width = 200, height = 80, showDotCom = true, className = '' }: LogoProps) => {
  // Calculate display dimensions while maintaining proportions
  const originalAspectRatio = 650 / 200; // Wider aspect ratio to fit larger text
  const calculatedWidth = height * originalAspectRatio;
  
  return (
    <div style={{ width: calculatedWidth, height }} className={`flex items-center ${className}`}>
      <svg 
        width={calculatedWidth} 
        height={height} 
        viewBox="0 0 650 200" 
        xmlns="http://www.w3.org/2000/svg"
        className="mr-2"
        style={{ filter: "drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.1))" }}
      >
        {/* Book stack - increased size and improved proportions */}
        <g transform="translate(50, 15)">
          {/* Bottom book - larger sizes for better visibility */}
          <rect x="0" y="75" width="100" height="35" rx="3" ry="3" fill={LOGO_COLORS.BLUE} />
          
          {/* Middle book */}
          <rect x="5" y="40" width="100" height="35" rx="3" ry="3" fill={LOGO_COLORS.ORANGE} />
          
          {/* Top book */}
          <rect x="10" y="5" width="100" height="35" rx="3" ry="3" fill={LOGO_COLORS.BROWN} />
          
          {/* Add subtle details to books */}
          <line x1="15" y1="22" x2="95" y2="22" stroke="white" strokeWidth="1.5" strokeOpacity="0.3" />
          <line x1="10" y1="58" x2="90" y2="58" stroke="white" strokeWidth="1.5" strokeOpacity="0.3" />
          <line x1="5" y1="93" x2="85" y2="93" stroke="white" strokeWidth="1.5" strokeOpacity="0.3" />
        </g>
        
        {/* Company name - as one word with consistent font size */}
        <g transform="translate(170, 105)">
          {/* First part of name */}
          <text fontFamily="serif" fontWeight="bold" fontSize="56" fill={LOGO_COLORS.BLUE} 
                style={{ textShadow: "0px 1px 1px rgba(0, 0, 0, 0.1)" }}>
            Indie
          </text>
          
          {/* Second part of name - positioned closer for single word appearance */}
          <text x="125" fontFamily="serif" fontWeight="bold" fontSize="56" fill={LOGO_COLORS.ORANGE}
                style={{ textShadow: "0px 1px 1px rgba(0, 0, 0, 0.1)" }}>
            bookShop
          </text>
          
          {/* .com - slightly larger */}
          {showDotCom && (
            <text x="330" fontFamily="serif" fontWeight="bold" fontSize="36" fill={LOGO_COLORS.GRAY}>
              .com
            </text>
          )}
        </g>
      </svg>
    </div>
  );
};

export default Logo;