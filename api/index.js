// Vercel serverless function wrapper for Express app
// This file is used by Vercel to handle API routes
const app = require('../server.js');

// Export handler function for Vercel
// Vercel will call this function for all /api/* routes
module.exports = app;
