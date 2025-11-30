import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Serve ads.txt file
 * This ensures ads.txt is always accessible at the root domain
 */
export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Try to read from dist/public first (production build)
    const distPath = path.join(__dirname, '..', 'dist', 'public', 'ads.txt');
    // Fallback to client/public (development)
    const devPath = path.join(__dirname, '..', 'client', 'public', 'ads.txt');
    
    let adsTxtPath;
    if (fs.existsSync(distPath)) {
      adsTxtPath = distPath;
    } else if (fs.existsSync(devPath)) {
      adsTxtPath = devPath;
    } else {
      // If neither exists, return a default ads.txt
      return res
        .status(200)
        .setHeader('Content-Type', 'text/plain')
        .setHeader('Cache-Control', 'public, max-age=3600')
        .send(`# ads.txt file for IndiebookShop.com
# This file authorizes ad networks to sell your inventory
# 
# Publisher ID: ca-pub-4357894821158922
google.com, pub-4357894821158922, DIRECT, f08c47fec0942fa0
`);
    }

    const content = fs.readFileSync(adsTxtPath, 'utf-8');
    
    // Set appropriate headers
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.status(200).send(content);
  } catch (error) {
    console.error('Error serving ads.txt:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

