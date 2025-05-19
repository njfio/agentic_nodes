const request = require('supertest');

let server;

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  server = require('../server');
});

afterAll((done) => {
  server.close(done);
});

test('GET /health returns status UP', async () => {
  const res = await request(server).get('/health');
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('UP');
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

// Simple server with /health endpoint for demonstration
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

test('health check endpoint responds with status UP', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, resolve));
  const { port } = server.address();

  const response = await fetch(`http://localhost:${port}/health`);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.status, 'UP');

  server.close();
});
