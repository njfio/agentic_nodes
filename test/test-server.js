/**
 * Test Server
 * A simple server to serve the test pages
 */

const express = require('express');
const path = require('path');
const app = express();
const port = 8733;

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, '..')));

// Serve the test page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'agent-node-test.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Test server listening at http://localhost:${port}`);
});
