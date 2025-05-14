import React from 'react';
import { COLORS } from '@/lib/constants';

interface BookstoreIconProps {
  size?: number;
  className?: string;
}

const BookstoreIcon: React.FC<BookstoreIconProps> = ({ size = 150, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background */}
      <rect width="200" height="200" rx="10" fill="#f7f3e8" />
      
      {/* Bookshelf */}
      <rect x="30" y="130" width="140" height="15" fill={COLORS.primary} />
      
      {/* Books on shelf */}
      <rect x="35" y="75" width="20" height="55" fill={COLORS.secondary} />
      <rect x="60" y="65" width="15" height="65" fill={COLORS.accent} />
      <rect x="80" y="85" width="25" height="45" fill={COLORS.primary} />
      <rect x="110" y="70" width="18" height="60" fill={COLORS.accent} />
      <rect x="133" y="80" width="12" height="50" fill={COLORS.secondary} />
      <rect x="150" y="60" width="20" height="70" fill={COLORS.primary} />
      
      {/* Store name placard */}
      <rect x="60" y="40" width="80" height="15" rx="2" fill={COLORS.accent} />
      
      {/* IndieBookshop text */}
      <text 
        x="100" 
        y="170" 
        fontFamily="Arial, sans-serif" 
        fontSize="12" 
        fontWeight="bold" 
        fill={COLORS.dark}
        textAnchor="middle"
      >
        INDIE BOOKSHOP
      </text>
    </svg>
  );
};

export default BookstoreIcon;