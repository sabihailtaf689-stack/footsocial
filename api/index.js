// Vercel serverless function wrapper for Express app
// This file is used by Vercel to handle API routes
const app = require('../server.js');

// Export handler function for Vercel
// Vercel will call this function for all /api/* routes
// The app is already exported from server.js, but we need to ensure it's properly handled
module.exports = (req, res) => {
  // Vercel passes the request directly to the Express app
  return app(req, res);
};
