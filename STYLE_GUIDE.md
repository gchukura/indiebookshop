# IndieBookShop.com Style Guide

This document outlines the design system and coding standards for the IndieBookShop.com project.

## Table of Contents
- [Padding Standards](#padding-standards)
- [Responsive Breakpoints](#responsive-breakpoints)
- [Color Palette](#color-palette)
- [Typography](#typography)

---

## Padding Standards

All padding values follow a consistent, responsive pattern to ensure visual consistency across the application.

### Section Padding (Between Modules)

**Standard:** `py-8 md:py-12 lg:py-16`

- **Mobile (default):** `py-8` (2rem / 32px vertical padding)
- **Medium screens (md):** `md:py-12` (3rem / 48px vertical padding)
- **Large screens (lg):** `lg:py-16` (4rem / 64px vertical padding)

**Usage:** Apply to all `<section>` elements to create consistent spacing between major content modules.

```tsx
<section className="py-8 md:py-12 lg:py-16">
  {/* Section content */}
</section>
```

### Container Padding (Horizontal)

**Standard:** `px-4 sm:px-6 lg:px-8`

- **Mobile (default):** `px-4` (1rem / 16px horizontal padding)
- **Small screens (sm):** `sm:px-6` (1.5rem / 24px horizontal padding)
- **Large screens (lg):** `lg:px-8` (2rem / 32px horizontal padding)

**Usage:** Apply to all container elements (`container mx-auto`) to ensure consistent horizontal spacing.

```tsx
<div className="container mx-auto px-4 sm:px-6 lg:px-8">
  {/* Container content */}
</div>
```

### Internal Wrapper Padding (Content Blocks)

**Standard:** `p-6 md:p-8 lg:p-10`

- **Mobile (default):** `p-6` (1.5rem / 24px padding on all sides)
- **Medium screens (md):** `md:p-8` (2rem / 32px padding on all sides)
- **Large screens (lg):** `lg:p-10` (2.5rem / 40px padding on all sides)

**Usage:** Apply to colored background wrapper divs (e.g., `bg-white`, `bg-[#F7F3E8]`) that contain content within containers.

```tsx
<div className="container mx-auto px-4 sm:px-6 lg:px-8">
  <div className="bg-white rounded-lg p-6 md:p-8 lg:p-10">
    {/* Content */}
  </div>
</div>
```

### Complete Example

Here's a complete example showing all three padding standards used together:

```tsx
<section className="py-8 md:py-12 lg:py-16">
  <div className="container mx-auto px-4 sm:px-6 lg:px-8">
    <div className="bg-[#F7F3E8] rounded-lg p-6 md:p-8 lg:p-10">
      <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#5F4B32] mb-4">
        Section Title
      </h2>
      <p>Content goes here...</p>
    </div>
  </div>
</section>
```

### Notes

- **Never use fixed padding values** like `p-2`, `p-4`, or `p-12` directly on section or container elements. Always use the responsive variants.
- **Avoid mixing patterns** - stick to the three standard patterns above.
- **For special cases** (like cards, buttons, or small components), use appropriate padding, but ensure it's responsive.

---

## Responsive Breakpoints

The project uses Tailwind CSS default breakpoints:

- **sm:** 640px and up
- **md:** 768px and up
- **lg:** 1024px and up
- **xl:** 1280px and up
- **2xl:** 1536px and up

---

## Color Palette

### Primary Colors
- **Brown:** `#5F4B32` - Used for headings and primary text
- **Teal:** `#2A6B7C` - Used for links and accents
- **Orange:** `#E16D3D` - Used for hover states and highlights

### Background Colors
- **White:** `bg-white` - Default background
- **Cream:** `bg-[#F7F3E8]` - Alternate section background
- **Light Gray:** `#E3E9ED` - Borders and subtle backgrounds

---

## Typography

### Headings

All headings should be responsive:

- **H1:** `text-2xl md:text-3xl lg:text-4xl`
- **H2:** `text-2xl md:text-3xl`
- **H3:** `text-xl md:text-2xl`
- **H4:** `text-lg md:text-xl`

### Font Families
- **Serif:** `font-serif` - Used for headings
- **Sans:** `font-sans` - Used for body text (default)

---

## Best Practices

1. **Always use responsive padding** - Never hardcode padding values
2. **Follow the three-tier padding system** - Section → Container → Wrapper
3. **Maintain consistency** - Use the same padding patterns across similar components
4. **Test on mobile first** - Ensure padding works well on small screens
5. **Use semantic HTML** - Proper use of `<section>`, `<div>`, etc.

---

## Last Updated

January 2025 - Padding standards standardized across all pages.

