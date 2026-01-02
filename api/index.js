// Vercel serverless function wrapper for Express app
// This file is used by Vercel to handle API routes
const app = require('../server.js');

// Export handler for Vercel serverless functions
// Vercel rewrites /api/* to this function, preserving the original URL path
// Express apps handle responses via res.send(), res.json(), etc., not return values
// So we call app(req, res) without returning anything
module.exports = (req, res) => {
  app(req, res);
  // Don't return - Express handles the response asynchronously
};
