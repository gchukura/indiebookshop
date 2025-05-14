import React from 'react';

interface LogoProps {
  width?: number;
  height?: number;
  showDotCom?: boolean;
}

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
          <rect x="0" y="70" width="90" height="30" rx="2" ry="2" fill="#3d6a80" />
          
          {/* Middle book */}
          <rect x="5" y="40" width="90" height="30" rx="2" ry="2" fill="#e65c4f" />
          
          {/* Top book */}
          <rect x="10" y="10" width="90" height="30" rx="2" ry="2" fill="#5d8aa8" />
        </g>
        
        {/* Company name */}
        <g transform="translate(165, 87)">
          {/* Indie */}
          <text fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="36" fill="#3d6a80">
            Indie
          </text>
          
          {/* Bookshop */}
          <text x="85" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="36" fill="#e65c4f">
            Bookshop
          </text>
          
          {/* .com */}
          {showDotCom && (
            <text x="260" fontFamily="Arial, sans-serif" fontWeight="normal" fontSize="18" fill="#666666">
              .com
            </text>
          )}
        </g>
      </svg>
    </div>
  );
};

export default Logo;