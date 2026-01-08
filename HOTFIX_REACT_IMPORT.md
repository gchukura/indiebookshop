# Hotfix: React Import Error in mapboxCssLoader.ts

**Date:** January 3, 2026  
**Issue:** `Uncaught TypeError: Cannot read properties of undefined (reading 'useState')`  
**Status:** ✅ Fixed

## Problem

The live site was crashing with:
```
Uncaught TypeError: Cannot read properties of undefined (reading 'useState')
```

This was caused by importing React as a default import and using `React.useState` and `React.useEffect`, which doesn't work correctly in the bundled code.

## Root Cause

In `client/src/lib/mapboxCssLoader.ts`, we were using:
```typescript
import React from 'react';
// ...
React.useState(...)
React.useEffect(...)
```

However, other utility files in the project (like `imageUtils.ts`) import hooks directly:
```typescript
import { useState, useEffect } from 'react';
```

The bundled code wasn't resolving `React.useState` correctly, causing the error.

## Solution

Changed the import to use named imports directly, matching the pattern used in other utility files:

**Before:**
```typescript
import React from 'react';

export function useMapboxCss() {
  const [loaded, setLoaded] = React.useState(mapboxCssLoaded);
  const [error, setError] = React.useState<Error | null>(null);
  React.useEffect(() => { ... }, []);
}
```

**After:**
```typescript
import { useState, useEffect } from 'react';

export function useMapboxCss() {
  const [loaded, setLoaded] = useState(mapboxCssLoaded);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => { ... }, []);
}
```

## Files Changed

- `client/src/lib/mapboxCssLoader.ts`: Fixed React import to use named imports

## Testing

- ✅ No linter errors
- ✅ Import pattern matches other utility files
- ✅ All React hooks properly imported

## Deployment

This fix should be deployed immediately to resolve the live site error. The change is minimal and follows the existing codebase patterns.
