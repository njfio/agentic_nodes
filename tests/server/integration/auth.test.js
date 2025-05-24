const request = require('supertest');
const app = require('../../../server');
const User = require('../../../models/User');
const jwt = require('jsonwebtoken');

describe('Auth API Integration Tests', () => {
  let server;

  beforeAll(async () => {
    // Start server on random port
    server = app.listen(0);
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(async () => {
    // Clear users collection
    await User.deleteMany({});
  });

  describe('POST /api/v2/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Test123!@#'
      };

      const response = await request(server)
        .post('/api/v2/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.username).toBe(userData.username);
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user).not.toHaveProperty('password');

      // Verify user was created in database
      const user = await User.findOne({ username: userData.username });
      expect(user).toBeTruthy();
      expect(user.email).toBe(userData.email);
    });

    it('should validate required fields', async () => {
      const response = await request(server)
        .post('/api/v2/auth/register')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
      expect(response.body.details).toBeDefined();
    });

    it('should reject duplicate username', async () => {
      const userData = {
        username: 'existinguser',
        email: 'first@example.com',
        password: 'Test123!@#'
      };

      // Create first user
      await request(server)
        .post('/api/v2/auth/register')
        .send(userData)
        .expect(201);

      // Try to create duplicate
      const response = await request(server)
        .post('/api/v2/auth/register')
        .send({
          ...userData,
          email: 'second@example.com'
        })
        .expect(400);

      expect(response.body.error).toMatch(/already exists/i);
    });

    it('should validate password complexity', async () => {
      const response = await request(server)
        .post('/api/v2/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'weak'
        })
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });

    it('should validate email format', async () => {
      const response = await request(server)
        .post('/api/v2/auth/register')
        .send({
          username: 'testuser',
          email: 'not-an-email',
          password: 'Test123!@#'
        })
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });
  });

  describe('POST /api/v2/auth/login', () => {
    let testUser;
    const password = 'Test123!@#';

    beforeEach(async () => {
      testUser = await User.create({
        username: 'logintest',
        email: 'login@example.com',
        password: password
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(server)
        .post('/api/v2/auth/login')
        .send({
          username: testUser.username,
          password: password
        })
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user._id).toBe(testUser._id.toString());

      // Verify token is valid
      const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);
      expect(decoded._id).toBe(testUser._id.toString());
    });

    it('should login with email instead of username', async () => {
      const response = await request(server)
        .post('/api/v2/auth/login')
        .send({
          username: testUser.email,
          password: password
        })
        .expect(200);

      expect(response.body.user._id).toBe(testUser._id.toString());
    });

    it('should reject invalid password', async () => {
      const response = await request(server)
        .post('/api/v2/auth/login')
        .send({
          username: testUser.username,
          password: 'WrongPassword123!'
        })
        .expect(401);

      expect(response.body.error).toMatch(/invalid credentials/i);
    });

    it('should reject non-existent user', async () => {
      const response = await request(server)
        .post('/api/v2/auth/login')
        .send({
          username: 'nonexistent',
          password: password
        })
        .expect(401);

      expect(response.body.error).toMatch(/invalid credentials/i);
    });

    it('should handle rate limiting', async () => {
      // Make multiple rapid requests
      const requests = Array(20).fill(null).map(() =>
        request(server)
          .post('/api/v2/auth/login')
          .send({
            username: 'testuser',
            password: 'wrong'
          })
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.find(r => r.status === 429);

      expect(rateLimited).toBeDefined();
      expect(rateLimited.body.error).toBe('Rate Limited');
    });
  });

  describe('GET /api/v2/auth/profile', () => {
    let testUser, authToken;

    beforeEach(async () => {
      testUser = await User.create({
        username: 'profiletest',
        email: 'profile@example.com',
        password: 'Test123!@#'
      });

      authToken = jwt.sign(
        { _id: testUser._id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    });

    it('should get user profile with valid token', async () => {
      const response = await request(server)
        .get('/api/v2/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.user._id).toBe(testUser._id.toString());
      expect(response.body.user.username).toBe(testUser.username);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should reject request without token', async () => {
      const response = await request(server)
        .get('/api/v2/auth/profile')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should reject invalid token', async () => {
      const response = await request(server)
        .get('/api/v2/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should reject expired token', async () => {
      const expiredToken = jwt.sign(
        { _id: testUser._id },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' }
      );

      const response = await request(server)
        .get('/api/v2/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('PUT /api/v2/auth/profile', () => {
    let testUser, authToken;

    beforeEach(async () => {
      testUser = await User.create({
        username: 'updatetest',
        email: 'update@example.com',
        password: 'Test123!@#'
      });

      authToken = jwt.sign(
        { _id: testUser._id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    });

    it('should update user profile', async () => {
      const updates = {
        email: 'newemail@example.com',
        preferences: {
          theme: 'dark',
          notifications: true
        }
      };

      const response = await request(server)
        .put('/api/v2/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.user.email).toBe(updates.email);
      expect(response.body.user.preferences.theme).toBe('dark');

      // Verify in database
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.email).toBe(updates.email);
    });

    it('should not allow updating username', async () => {
      const response = await request(server)
        .put('/api/v2/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          username: 'newusername'
        })
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });

    it('should validate email format on update', async () => {
      const response = await request(server)
        .put('/api/v2/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'invalid-email'
        })
        .expect(400);

      expect(response.body.error).toBe('Validation Error');
    });

    it('should handle password change', async () => {
      const response = await request(server)
        .put('/api/v2/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'Test123!@#',
          newPassword: 'NewTest123!@#'
        })
        .expect(200);

      // Verify can login with new password
      const loginResponse = await request(server)
        .post('/api/v2/auth/login')
        .send({
          username: testUser.username,
          password: 'NewTest123!@#'
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('token');
    });

    it('should reject password change with wrong current password', async () => {
      const response = await request(server)
        .put('/api/v2/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: 'NewTest123!@#'
        })
        .expect(400);

      expect(response.body.error).toMatch(/current password.*incorrect/i);
    });
  });

  describe('POST /api/v2/auth/logout', () => {
    let testUser, authToken;

    beforeEach(async () => {
      testUser = await User.create({
        username: 'logouttest',
        email: 'logout@example.com',
        password: 'Test123!@#'
      });

      authToken = jwt.sign(
        { _id: testUser._id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    });

    it('should logout successfully', async () => {
      const response = await request(server)
        .post('/api/v2/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toMatch(/logged out/i);
    });

    it('should require authentication for logout', async () => {
      const response = await request(server)
        .post('/api/v2/auth/logout')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('POST /api/v2/auth/refresh', () => {
    let testUser, authToken, refreshToken;

    beforeEach(async () => {
      testUser = await User.create({
        username: 'refreshtest',
        email: 'refresh@example.com',
        password: 'Test123!@#'
      });

      authToken = jwt.sign(
        { _id: testUser._id },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      refreshToken = jwt.sign(
        { _id: testUser._id, type: 'refresh' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
    });

    it('should refresh token with valid refresh token', async () => {
      const response = await request(server)
        .post('/api/v2/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');

      // Verify new token is valid
      const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);
      expect(decoded._id).toBe(testUser._id.toString());
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(server)
        .post('/api/v2/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.error).toMatch(/invalid.*token/i);
    });

    it('should reject expired refresh token', async () => {
      const expiredRefreshToken = jwt.sign(
        { _id: testUser._id, type: 'refresh' },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' }
      );

      const response = await request(server)
        .post('/api/v2/auth/refresh')
        .send({ refreshToken: expiredRefreshToken })
        .expect(401);

      expect(response.body.error).toMatch(/token.*expired/i);
    });
  });
});