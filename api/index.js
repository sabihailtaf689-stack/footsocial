// Vercel serverless function wrapper for Express app
// This file is used by Vercel to handle API routes
const app = require('../server.js');

// Export handler for Vercel serverless functions
// Vercel rewrites /api/* to this function, preserving the original URL path
module.exports = app;
