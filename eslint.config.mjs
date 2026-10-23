import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    'node_modules/**',
    'next-env.d.ts',
    'scripts/archive/**', // old Supabase/Vite scripts, kept for reference only
    'docs/**',
    'playwright-report/**',
    'test-results/**',
  ]),
]);
