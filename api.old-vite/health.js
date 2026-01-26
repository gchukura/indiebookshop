// Simple health check endpoint for Vercel
export default function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    version: process.env.npm_package_version || '1.0.0'
  });
}