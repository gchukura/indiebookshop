const fs = require('fs');
const path = require('path');

// Create a vercel-package.json file for deployment
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Modify package.json for Vercel
const vercelPackageJson = {
  ...packageJson,
  scripts: {
    ...packageJson.scripts,
    "build": "vite build && tsc",
    "start": "node dist/index.js"
  }
};

// Write the modified package.json for Vercel
fs.writeFileSync('vercel-package.json', JSON.stringify(vercelPackageJson, null, 2));

console.log('Created vercel-package.json for deployment');