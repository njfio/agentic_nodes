const express = require('express');
const app = express();
const PORT = 8731;

app.get('/', (req, res) => {
  res.send('Server is working!');
});

app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});
