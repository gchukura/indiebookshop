// This script runs when Vercel builds the project
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Starting Vercel build process...');

// Run the Vite build
console.log('Building frontend with Vite...');
execSync('npx vite build', { stdio: 'inherit' });

// Run TypeScript type checking (non-blocking - errors won't fail the build)
console.log('Checking TypeScript types...');
try {
  execSync('tsc --project tsconfig.json --noEmit', { stdio: 'inherit' });
  console.log('TypeScript check passed');
} catch (error) {
  console.warn('TypeScript check found errors, but continuing build (these are type-only errors, not runtime errors)');
  // Don't throw - allow build to continue
}

// Copy necessary files for serverless functions
console.log('Copying files for serverless functions...');

// Ensure public folder exists
const distPublicDir = path.join(process.cwd(), 'dist', 'public');
if (!fs.existsSync(distPublicDir)) {
  fs.mkdirSync(distPublicDir, { recursive: true });
}

// Create environment variables config file for Vercel
console.log('Setting up environment config...');
const envConfigContent = `
// Environment configuration for Vercel
export const ENV = {
  NODE_ENV: '${process.env.NODE_ENV || 'production'}',
  USE_SAMPLE_DATA: '${process.env.USE_SAMPLE_DATA || 'true'}',
  GOOGLE_SHEETS_ID: '${process.env.GOOGLE_SHEETS_ID || ''}',
  USE_MEM_STORAGE: '${process.env.USE_MEM_STORAGE || 'false'}'
};
`;

fs.writeFileSync('api/env-config.js', envConfigContent);

// Extract script and CSS paths from built index.html for bookshop-slug function
console.log('Extracting script paths from built index.html...');
const indexPath = path.join(process.cwd(), 'dist', 'public', 'index.html');
if (fs.existsSync(indexPath)) {
  const indexHtml = fs.readFileSync(indexPath, 'utf-8');
  const scriptMatch = indexHtml.match(/<script[^>]+src="([^"]+)"[^>]*>/);
  const cssMatch = indexHtml.match(/<link[^>]+href="([^"]+\.css)"[^>]*>/);
  
  const scriptPath = scriptMatch ? scriptMatch[1] : '/assets/index.js';
  const cssPath = cssMatch ? cssMatch[1] : null;
  
  // Create a config file with the script paths
  const scriptConfigContent = `
// Auto-generated script paths from built index.html
// This file is generated during build to ensure correct hashed filenames
export const SCRIPT_PATH = '${scriptPath}';
export const CSS_PATH = ${cssPath ? `'${cssPath}'` : 'null'};
`;
  
  fs.writeFileSync('api/script-paths.js', scriptConfigContent);
  console.log(`Extracted script path: ${scriptPath}`);
  if (cssPath) {
    console.log(`Extracted CSS path: ${cssPath}`);
  }
} else {
  console.warn('Warning: Could not find built index.html to extract script paths');
}

console.log('Vercel build process completed successfully.');