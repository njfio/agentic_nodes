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
});
