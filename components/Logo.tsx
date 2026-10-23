import React from 'react';
import { COLORS } from "@/lib/constants";

interface LogoProps {
  width?: number;
  height?: number;
  showDotCom?: boolean;
  className?: string;
  /** Crop the empty margins so the wordmark stays readable at small heights (e.g. the 56px phone header). */
  tight?: boolean;
}

// Logo color constants - matching the website theme
const LOGO_COLORS = {
  BLUE: COLORS.secondary,      // Teal color from site theme
  ORANGE: COLORS.accent,       // Orange from site theme
  BROWN: COLORS.primary,       // Brown from site theme
  GRAY: COLORS.dark,           // Dark text color
};

// The artwork's bounding box inside the 600×200 canvas
const TIGHT_VIEWBOX = { x: 50, y: 25, width: 465, height: 100 };

const Logo = ({ height = 60, showDotCom = true, className, tight = false }: LogoProps) => {
  // Calculate display dimensions while maintaining proportions
  const viewBox = tight ? TIGHT_VIEWBOX : { x: 0, y: 0, width: 600, height: 200 };
  const calculatedWidth = height * (viewBox.width / viewBox.height);


  return (
    <div style={{ width: calculatedWidth, height }} className={`flex items-center ${className || ''}`}>
      <svg
        width={calculatedWidth}
        height={height}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        xmlns="http://www.w3.org/2000/svg"
        className="mr-2"
        aria-hidden="true"
        focusable="false"
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

        {/* Company name - adjusted positioning with more space between books and text */}
        <g transform="translate(170, 92)">
          {/* Indie */}
          <text fontFamily="serif" fontWeight="bold" fontSize="42" fill={LOGO_COLORS.BLUE}>
            Indie
          </text>

          {/* Bookshop */}
          <text x="90" fontFamily="serif" fontWeight="bold" fontSize="42" fill={LOGO_COLORS.ORANGE}>
            Bookshop
          </text>

          {/* .com */}
          {showDotCom && (
            <text x="270" fontFamily="serif" fontWeight="bold" fontSize="28" fill={LOGO_COLORS.GRAY}>
              .com
            </text>
          )}
        </g>
      </svg>
    </div>
  );
};

export default Logo;
