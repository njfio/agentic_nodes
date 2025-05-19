const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');

function createServer() {
  return http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'UP' }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });
}

test('GET /health returns status UP', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, resolve));
  const { port } = server.address();
  const res = await fetch(`http://localhost:${port}/health`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'UP');
  server.close();
});
