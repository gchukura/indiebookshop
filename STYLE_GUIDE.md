# IndieBookShop.com Style Guide

This document outlines the comprehensive design system and coding standards for the IndieBookShop.com project.

## Table of Contents
- [Padding Standards](#padding-standards)
- [Responsive Breakpoints](#responsive-breakpoints)
- [Color Palette](#color-palette)
- [Typography](#typography)
- [Borders](#borders)
- [Buttons](#buttons)
- [Forms](#forms)
- [Section Templates](#section-templates)
- [Component Patterns](#component-patterns)
- [Best Practices](#best-practices)

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

### Card Padding

**Standard:** `p-4 md:p-5 lg:p-6`

- **Mobile (default):** `p-4` (1rem / 16px padding)
- **Medium screens (md):** `md:p-5` (1.25rem / 20px padding)
- **Large screens (lg):** `lg:p-6` (1.5rem / 24px padding)

**Usage:** Apply to card components and smaller content blocks.

### Grid Gaps

**Standard:** `gap-4 md:gap-6 lg:gap-8`

- **Mobile (default):** `gap-4` (1rem / 16px gap)
- **Medium screens (md):** `md:gap-6` (1.5rem / 24px gap)
- **Large screens (lg):** `lg:gap-8` (2rem / 32px gap)

**Usage:** Apply to grid layouts for consistent spacing between grid items.

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
- **Avoid mixing patterns** - stick to the standard patterns above.
- **For special cases** (like buttons or small components), use appropriate padding, but ensure it's responsive.

---

## Responsive Breakpoints

The project uses Tailwind CSS default breakpoints:

- **sm:** 640px and up
- **md:** 768px and up
- **lg:** 1024px and up
- **xl:** 1280px and up
- **2xl:** 1536px and up

**Mobile-first approach:** Always design for mobile first, then enhance for larger screens.

---

## Color Palette

### Primary Colors
- **Brown:** `#5F4B32` - Used for headings and primary text
- **Teal:** `#2A6B7C` - Used for links, secondary actions, borders, and accents
- **Orange:** `#E16D3D` - Used for primary CTAs, hover states, stats, and highlights

### Background Colors
- **White:** `bg-white` - Default background
- **Beige/Cream:** `bg-[#F7F3E8]` - Alternate section background
- **Light Gray:** `bg-gray-50` or `#E3E9ED` - Subtle backgrounds and borders
- **Subtle Teal:** `bg-[#2A6B7C]/5` - 5% opacity teal for subtle backgrounds

### Text Colors
- **Primary Text:** `text-gray-900` or `text-[#5F4B32]` for headings
- **Secondary Text:** `text-gray-700` or `text-gray-600`
- **Muted Text:** `text-gray-500`
- **Links:** `text-[#2A6B7C]` with `hover:text-[#E16D3D]`

### Feature Tags
- **Background:** `bg-[rgba(42,107,124,0.1)]` (10% teal opacity)
- **Text:** `text-[#2A6B7C]`

---

## Typography

### Font Families
- **Serif:** `font-serif` (Libre Baskerville) - Used for all headings
- **Sans:** `font-sans` (Open Sans) - Used for body text (default)

### Typography Scale

All headings should be responsive and use the serif font:

- **Display (Hero):** `text-3xl md:text-4xl lg:text-display` - Largest text for hero sections
- **H1:** `text-2xl md:text-3xl lg:text-4xl` - Main page headings
- **H2 (High Priority):** `text-2xl md:text-3xl` - Major section headings
- **H2 (Lower Priority):** `text-xl md:text-2xl` - Secondary section headings
- **H3:** `text-base md:text-lg lg:text-xl` - Subsection headings
- **H4:** `text-lg md:text-xl` - Minor headings
- **Body:** `text-sm md:text-base` - Default body text
- **Body Large:** `text-base md:text-lg` - Emphasized body text
- **Small:** `text-xs md:text-sm` - Captions and small text

### Heading Examples

```tsx
// Hero/Display
<h1 className="font-serif text-3xl md:text-4xl lg:text-display font-bold text-white">
  Hero Title
</h1>

// Main Page Heading
<h1 className="font-serif text-2xl md:text-3xl lg:text-4xl font-bold text-[#5F4B32]">
  Page Title
</h1>

// Section Heading (High Priority)
<h2 className="font-serif text-2xl md:text-3xl font-bold text-[#5F4B32]">
  Section Title
</h2>

// Section Heading (Lower Priority)
<h2 className="font-serif text-xl md:text-2xl font-bold text-[#5F4B32]">
  Secondary Section
</h2>
```

### Body Text

```tsx
// Standard body text
<p className="text-sm md:text-base text-gray-700">
  Body text content
</p>

// Large body text
<p className="text-base md:text-lg text-gray-700">
  Emphasized body text
</p>
```

---

## Borders

### Standard Border

**Teal Border (Brand Standard):** `border-4 border-[#2A6B7C]`

- **Width:** `border-4` (4px)
- **Color:** `border-[#2A6B7C]` (brand teal)
- **Radius:** `rounded-lg`

**Usage:** Apply to map containers, section borders, and highlighted content blocks.

```tsx
<div className="border-4 border-[#2A6B7C] rounded-lg p-6 md:p-8 lg:p-10">
  {/* Content */}
</div>
```

### Border with Intersecting Heading

For sections with borders and headings that intersect the border:

```tsx
<div className="relative border-4 border-[#2A6B7C] rounded-lg p-4 md:p-6 lg:p-8 pt-8">
  <div className="absolute -top-4 md:-top-5 left-0 w-full flex justify-center px-2">
    <h2 className="inline-block bg-[#F7F3E8] px-2 md:px-5 text-2xl md:text-3xl font-serif font-bold text-[#5F4B32] text-center">
      Section Title
    </h2>
  </div>
  <div className="mt-2 md:mt-0">
    {/* Content */}
  </div>
</div>
```

### Form Input Borders

```tsx
className="border border-gray-300 rounded-lg focus:border-[#2A6B7C] focus:ring-[#2A6B7C]"
```

---

## Buttons

### Primary Button (Orange)

**Usage:** Main CTAs, primary actions

```tsx
<Button className="bg-[#E16D3D] hover:bg-[#d06a4f] text-white px-6 py-3 rounded-full min-h-[44px]">
  Primary Action
</Button>
```

### Secondary Button (Teal)

**Usage:** Secondary actions, alternative CTAs

```tsx
<Button className="bg-[#2A6B7C] hover:bg-[#1d5a6a] text-white px-6 py-3 rounded-full min-h-[44px]">
  Secondary Action
</Button>
```

### Outline Button

```tsx
<Button variant="outline" className="border-[#2A6B7C] text-[#2A6B7C] hover:bg-[#2A6B7C]/10 px-6 py-3 min-h-[44px]">
  Outline Action
</Button>
```

### Button Best Practices

- **Minimum height:** `min-h-[44px]` for mobile touch targets
- **Padding:** `px-6 py-3` for standard buttons
- **Border radius:** `rounded-full` for primary/secondary, `rounded-lg` for outline
- **Transitions:** Include hover states with darker shades
- **Responsive:** Text size should scale: `text-base md:text-sm`

---

## Forms

### Form Container

```tsx
<div className="bg-white rounded-lg shadow-md p-6 md:p-8 lg:p-10">
  <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#5F4B32] mb-6">
    Form Title
  </h2>
  {/* Form fields */}
</div>
```

### Form Labels

```tsx
<label className="text-sm font-medium text-gray-700">
  Label Text
</label>
```

### Form Inputs

```tsx
<input 
  type="text"
  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-[#2A6B7C] focus:ring-[#2A6B7C] focus:ring-2 focus:ring-offset-0"
/>
```

### Form Error Messages

```tsx
<p className="text-sm text-red-600 mt-1">
  Error message
</p>
```

### Form Success Messages

```tsx
<p className="text-sm text-[#2A6B7C] mt-1">
  Success message
</p>
```

---

## Section Templates

### Standard Content Section

```tsx
<section className="py-8 md:py-12 lg:py-16">
  <div className="container mx-auto px-4 sm:px-6 lg:px-8">
    <div className="bg-white rounded-lg p-6 md:p-8 lg:p-10">
      <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#5F4B32] mb-4">
        Section Title
      </h2>
      <p className="text-sm md:text-base text-gray-700">
        Content goes here...
      </p>
    </div>
  </div>
</section>
```

### Beige Background Section

```tsx
<section className="py-8 md:py-12 lg:py-16">
  <div className="container mx-auto px-4 sm:px-6 lg:px-8">
    <div className="bg-[#F7F3E8] rounded-lg p-6 md:p-8 lg:p-10">
      <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#5F4B32] mb-4">
        Section Title
      </h2>
      <p className="text-sm md:text-base text-gray-700">
        Content goes here...
      </p>
    </div>
  </div>
</section>
```

### Section with Teal Border

```tsx
<section className="py-8 md:py-12 lg:py-16">
  <div className="container mx-auto px-4 sm:px-6 lg:px-8">
    <div className="bg-white rounded-lg p-6 md:p-8 lg:p-10">
      <div className="relative border-4 border-[#2A6B7C] rounded-lg p-4 md:p-6 lg:p-8 pt-8">
        <div className="absolute -top-4 md:-top-5 left-0 w-full flex justify-center px-2">
          <h2 className="inline-block bg-white px-2 md:px-5 text-2xl md:text-3xl font-serif font-bold text-[#5F4B32] text-center">
            Section Title
          </h2>
        </div>
        <div className="mt-2 md:mt-0">
          {/* Content */}
        </div>
      </div>
    </div>
  </div>
</section>
```

### Hero Section (Homepage)

```tsx
<section className="bg-[#5F4B32] py-12 md:py-20 px-4 sm:px-6 lg:px-8">
  <div className="container mx-auto">
    <div className="max-w-5xl mx-auto text-center">
      <h1 className="font-serif text-3xl md:text-4xl lg:text-display font-bold text-white mb-4 md:mb-6">
        Hero Title
      </h1>
      <p className="font-sans text-base md:text-body-lg text-gray-100 mb-6 md:mb-10 max-w-4xl mx-auto px-2">
        Hero description
      </p>
      {/* CTAs */}
    </div>
  </div>
</section>
```

### Simplified Hero (Directory/Other Pages)

```tsx
<section className="bg-[#2A6B7C] py-8 md:py-12 px-4 sm:px-6 lg:px-8">
  <div className="container mx-auto">
    <div className="max-w-4xl mx-auto text-center">
      <h1 className="font-serif text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 md:mb-4">
        Page Title
      </h1>
      <p className="font-sans text-sm md:text-base text-gray-100">
        Page description
      </p>
    </div>
  </div>
</section>
```

---

## Component Patterns

### Page Header (Standardized)

```tsx
<div className="max-w-3xl mx-auto mb-12">
  <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif font-bold text-[#5F4B32] mb-4">
    Page Title
  </h1>
  <p className="text-lg md:text-xl text-gray-600">
    Page description
  </p>
</div>
```

### Stats Bar

```tsx
<section className="py-8 bg-white border-y border-gray-200">
  <div className="container mx-auto px-4">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center max-w-4xl mx-auto">
      <div>
        <div className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-[#E16D3D] mb-2">2,000+</div>
        <div className="text-gray-700 font-medium">Independent Bookshops</div>
      </div>
      {/* More stats */}
    </div>
  </div>
</section>
```

### Feature Tags

```tsx
<span className="bg-[rgba(42,107,124,0.1)] text-[#2A6B7C] rounded-full px-3 py-1 text-sm font-semibold">
  Feature Name
</span>
```

### Table Styling

```tsx
// Table header
<thead className="bg-[#F7F3E8] text-[#5F4B32] font-serif font-bold">
  {/* Header cells */}
</thead>

// Table rows
<tbody>
  <tr className="hover:bg-gray-50 transition-colors">
    {/* Row cells */}
  </tr>
</tbody>

// Links in table
<a href="..." className="text-[#2A6B7C] hover:text-[#E16D3D] font-semibold">
  Link Text
</a>
```

---

## Best Practices

1. **Always use responsive padding** - Never hardcode padding values
2. **Follow the three-tier padding system** - Section → Container → Wrapper
3. **Maintain consistency** - Use the same padding patterns across similar components
4. **Test on mobile first** - Ensure all elements work well on small screens
5. **Use semantic HTML** - Proper use of `<section>`, `<div>`, etc.
6. **Consistent colors** - Always use exact hex codes from the color palette
7. **Typography hierarchy** - Follow the typography scale for proper visual hierarchy
8. **Touch targets** - Minimum 44px height for interactive elements on mobile
9. **Transitions** - Use smooth transitions (300ms) for hover states
10. **Accessibility** - Ensure proper contrast ratios and ARIA labels

---

## Reference Implementation

The **Home.tsx** page serves as the reference implementation for all style guide patterns. When in doubt, reference this file for examples of:
- Section structure
- Padding patterns
- Typography usage
- Color application
- Responsive design

---

## Last Updated

January 2025 - Comprehensive style guide established with padding standards, typography scale, color palette, borders, buttons, forms, and section templates.

