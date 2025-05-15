// This script runs when Vercel builds the project
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting Vercel build process...');

// Run the Vite build
console.log('Building frontend with Vite...');
execSync('vite build', { stdio: 'inherit' });

// Run TypeScript compilation
console.log('Compiling TypeScript...');
execSync('tsc --project tsconfig.json', { stdio: 'inherit' });

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

console.log('Vercel build process completed successfully.');