const { authenticate } = require('../../../middleware/auth');
const jwt = require('jsonwebtoken');
const User = require('../../../models/User');

// Mock User model
jest.mock('../../../models/User');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      header: jest.fn(),
      headers: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    
    // Reset JWT_SECRET for tests
    process.env.JWT_SECRET = 'test-jwt-secret';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should authenticate valid token', async () => {
      const userId = 'user123';
      const token = jwt.sign({ _id: userId }, process.env.JWT_SECRET);
      const mockUser = {
        _id: userId,
        username: 'testuser',
        email: 'test@example.com'
      };

      req.header.mockReturnValue(`Bearer ${token}`);
      User.findById.mockResolvedValue(mockUser);

      await authenticate(req, res, next);

      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(req.token).toBe(token);
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject missing token', async () => {
      req.header.mockReturnValue(null);

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Please authenticate'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid token format', async () => {
      req.header.mockReturnValue('InvalidTokenFormat');

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Please authenticate'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject expired token', async () => {
      const token = jwt.sign(
        { _id: 'user123' },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' } // Already expired
      );

      req.header.mockReturnValue(`Bearer ${token}`);

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Please authenticate'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject token with invalid signature', async () => {
      const token = jwt.sign(
        { _id: 'user123' },
        'wrong-secret'
      );

      req.header.mockReturnValue(`Bearer ${token}`);

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Please authenticate'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject token for non-existent user', async () => {
      const token = jwt.sign({ _id: 'user123' }, process.env.JWT_SECRET);

      req.header.mockReturnValue(`Bearer ${token}`);
      User.findById.mockResolvedValue(null);

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Please authenticate'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const token = jwt.sign({ _id: 'user123' }, process.env.JWT_SECRET);

      req.header.mockReturnValue(`Bearer ${token}`);
      User.findById.mockRejectedValue(new Error('Database error'));

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Please authenticate'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle missing JWT_SECRET', async () => {
      delete process.env.JWT_SECRET;
      const token = 'some.token.here';

      req.header.mockReturnValue(`Bearer ${token}`);

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Please authenticate'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should accept token from different header formats', async () => {
      const userId = 'user123';
      const token = jwt.sign({ _id: userId }, process.env.JWT_SECRET);
      const mockUser = { _id: userId };

      // Test x-auth-token header
      req.headers['x-auth-token'] = token;
      User.findById.mockResolvedValue(mockUser);

      await authenticate(req, res, next);

      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
    });
  });
});