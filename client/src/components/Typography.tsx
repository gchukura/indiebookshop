import React from 'react';

interface TypographyProps {
  children: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  variant?: 'light' | 'dark'; // for background context
}

// Helper function for color classes
const getColorClass = (variant: 'light' | 'dark' = 'light', type: 'heading' | 'body' | 'meta') => {
  if (variant === 'dark') {
    switch (type) {
      case 'heading': return 'text-white';
      case 'body': return 'text-gray-100';
      case 'meta': return 'text-gray-300';
    }
  }
  // Light background (default)
  switch (type) {
    case 'heading': return 'text-gray-900';
    case 'body': return 'text-gray-700';
    case 'meta': return 'text-gray-600';
  }
};

export const Display = ({ children, className = '', as: Component = 'h1', variant = 'light' }: TypographyProps) => (
  <Component className={`font-serif text-display font-bold ${getColorClass(variant, 'heading')} ${className}`}>
    {children}
  </Component>
);

export const H1 = ({ children, className = '', as: Component = 'h1', variant = 'light' }: TypographyProps) => (
  <Component className={`font-serif text-h1 font-bold ${getColorClass(variant, 'heading')} ${className}`}>
    {children}
  </Component>
);

export const H2 = ({ children, className = '', as: Component = 'h2', variant = 'light' }: TypographyProps) => (
  <Component className={`font-serif text-h2 font-bold ${getColorClass(variant, 'heading')} ${className}`}>
    {children}
  </Component>
);

export const H3 = ({ children, className = '', as: Component = 'h3', variant = 'light' }: TypographyProps) => (
  <Component className={`font-serif text-h3 font-bold ${getColorClass(variant, 'heading')} ${className}`}>
    {children}
  </Component>
);

export const H4 = ({ children, className = '', as: Component = 'h4', variant = 'light' }: TypographyProps) => (
  <Component className={`font-serif text-h4 font-bold ${getColorClass(variant, 'heading')} ${className}`}>
    {children}
  </Component>
);

export const BodyLarge = ({ children, className = '', as: Component = 'p', variant = 'light' }: TypographyProps) => (
  <Component className={`font-sans text-body-lg ${getColorClass(variant, 'body')} ${className}`}>
    {children}
  </Component>
);

export const Body = ({ children, className = '', as: Component = 'p', variant = 'light' }: TypographyProps) => (
  <Component className={`font-sans text-body ${getColorClass(variant, 'body')} ${className}`}>
    {children}
  </Component>
);

export const BodySmall = ({ children, className = '', as: Component = 'p', variant = 'light' }: TypographyProps) => (
  <Component className={`font-sans text-body-sm ${getColorClass(variant, 'body')} ${className}`}>
    {children}
  </Component>
);

export const Label = ({ children, className = '', as: Component = 'label', variant = 'light' }: TypographyProps) => (
  <Component className={`font-sans text-label font-semibold ${getColorClass(variant, 'body')} ${className}`}>
    {children}
  </Component>
);

export const Meta = ({ children, className = '', as: Component = 'span', variant = 'light' }: TypographyProps) => (
  <Component className={`font-sans text-meta ${getColorClass(variant, 'meta')} ${className}`}>
    {children}
  </Component>
);

