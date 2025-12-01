/**
 * Serve ads.txt file
 * This ensures ads.txt is always accessible at the root domain
 * 
 * Google AdSense Publisher ID: ca-pub-4357894821158922
 */
export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Return ads.txt content directly (no filesystem access needed)
  const adsTxtContent = `# ads.txt file for IndiebookShop.com
# This file authorizes ad networks to sell your inventory
# 
# Publisher ID: ca-pub-4357894821158922
google.com, pub-4357894821158922, DIRECT, f08c47fec0942fa0
`;

  // Set appropriate headers
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
  res.status(200).send(adsTxtContent);
}

