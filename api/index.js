// Vercel serverless function wrapper for Express app
// This file is used by Vercel to handle API routes
const app = require('../server.js');

// Export handler for Vercel serverless functions
// Vercel passes req and res, but we need to ensure the path is correct
module.exports = (req, res) => {
  // Vercel rewrites /api/* to this function, so the original URL is preserved
  // The Express app expects routes like /api/register, which matches
  return app(req, res);
};
