'use client';

// components/ads/AdContainer.tsx
// Container component that reserves space to prevent CLS

import { ReactNode } from 'react';

interface AdContainerProps {
  children: ReactNode;
  width?: number | string;
  height: number;
  className?: string;
  label?: string;
  showLabel?: boolean;
}

export function AdContainer({
  children,
  width = '100%',
  height,
  className = '',
  label = 'Advertisement',
  showLabel = false,
}: AdContainerProps) {
  return (
    <div
      className={`ad-container ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        minHeight: `${height}px`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {showLabel && (
        <div
          style={{
            fontSize: '10px',
            color: '#999',
            textAlign: 'center',
            paddingBottom: '4px',
          }}
        >
          {label}
        </div>
      )}
      {children}
    </div>
  );
}

export default AdContainer;
