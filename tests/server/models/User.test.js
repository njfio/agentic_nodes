const User = require('../../../models/User');
const bcrypt = require('bcryptjs');

describe('User Model', () => {
  describe('Schema Validation', () => {
    it('should create a valid user', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Test123!@#'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.username).toBe(userData.username);
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.password).not.toBe(userData.password); // Should be hashed
      expect(savedUser.createdAt).toBeDefined();
    });

    it('should require username', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'Test123!@#'
      });

      await expect(user.save()).rejects.toThrow(/username.*required/i);
    });

    it('should require email', async () => {
      const user = new User({
        username: 'testuser',
        password: 'Test123!@#'
      });

      await expect(user.save()).rejects.toThrow(/email.*required/i);
    });

    it('should require password', async () => {
      const user = new User({
        username: 'testuser',
        email: 'test@example.com'
      });

      await expect(user.save()).rejects.toThrow(/password.*required/i);
    });

    it('should enforce unique username', async () => {
      const userData = {
        username: 'uniqueuser',
        email: 'unique1@example.com',
        password: 'Test123!@#'
      };

      await new User(userData).save();

      const duplicateUser = new User({
        ...userData,
        email: 'unique2@example.com'
      });

      await expect(duplicateUser.save()).rejects.toThrow(/duplicate key/i);
    });

    it('should validate email format', async () => {
      const user = new User({
        username: 'testuser',
        email: 'invalid-email',
        password: 'Test123!@#'
      });

      await expect(user.save()).rejects.toThrow(/valid email/i);
    });

    it('should validate password complexity', async () => {
      const weakPasswords = ['short', '12345678', 'password', 'PASSWORD', 'Pass1234'];

      for (const password of weakPasswords) {
        const user = new User({
          username: 'testuser',
          email: 'test@example.com',
          password
        });

        await expect(user.save()).rejects.toThrow(/password.*must contain/i);
      }
    });
  });

  describe('Password Hashing', () => {
    it('should hash password before saving', async () => {
      const plainPassword = 'Test123!@#';
      const user = new User({
        username: 'hashtest',
        email: 'hash@example.com',
        password: plainPassword
      });

      await user.save();

      expect(user.password).not.toBe(plainPassword);
      expect(user.password).toMatch(/^\$2[aby]\$/); // bcrypt hash pattern
    });

    it('should not rehash password on update if not modified', async () => {
      const user = await User.create({
        username: 'updatetest',
        email: 'update@example.com',
        password: 'Test123!@#'
      });

      const originalHash = user.password;

      user.email = 'newemail@example.com';
      await user.save();

      expect(user.password).toBe(originalHash);
    });

    it('should rehash password when modified', async () => {
      const user = await User.create({
        username: 'modifytest',
        email: 'modify@example.com',
        password: 'Test123!@#'
      });

      const originalHash = user.password;

      user.password = 'NewTest123!@#';
      await user.save();

      expect(user.password).not.toBe(originalHash);
      expect(user.password).not.toBe('NewTest123!@#');
    });
  });

  describe('Methods', () => {
    let user;

    beforeEach(async () => {
      user = await User.create({
        username: 'methodtest',
        email: 'method@example.com',
        password: 'Test123!@#'
      });
    });

    describe('comparePassword', () => {
      it('should return true for correct password', async () => {
        const isMatch = await user.comparePassword('Test123!@#');
        expect(isMatch).toBe(true);
      });

      it('should return false for incorrect password', async () => {
        const isMatch = await user.comparePassword('WrongPassword123!');
        expect(isMatch).toBe(false);
      });

      it('should handle bcrypt errors gracefully', async () => {
        jest.spyOn(bcrypt, 'compare').mockImplementationOnce(() => {
          throw new Error('bcrypt error');
        });

        const isMatch = await user.comparePassword('Test123!@#');
        expect(isMatch).toBe(false);
      });
    });

    describe('toJSON', () => {
      it('should exclude sensitive fields', () => {
        const userJSON = user.toJSON();

        expect(userJSON).not.toHaveProperty('password');
        expect(userJSON).not.toHaveProperty('tokens');
        expect(userJSON).not.toHaveProperty('resetPasswordToken');
        expect(userJSON).not.toHaveProperty('__v');
        expect(userJSON).toHaveProperty('username');
        expect(userJSON).toHaveProperty('email');
      });
    });
  });

  describe('Virtual Properties', () => {
    it('should calculate workflow count', async () => {
      const user = await User.create({
        username: 'virtualtest',
        email: 'virtual@example.com',
        password: 'Test123!@#'
      });

      // Add mock workflows
      user.workflows = [
        { _id: '1', name: 'Workflow 1' },
        { _id: '2', name: 'Workflow 2' },
        { _id: '3', name: 'Workflow 3' }
      ];

      expect(user.workflowCount).toBe(3);
    });
  });

  describe('Indexes', () => {
    it('should have indexes on username and email', () => {
      const indexes = User.schema.indexes();
      
      const usernameIndex = indexes.find(idx => idx[0].username !== undefined);
      const emailIndex = indexes.find(idx => idx[0].email !== undefined);
      
      expect(usernameIndex).toBeDefined();
      expect(emailIndex).toBeDefined();
      expect(usernameIndex[1].unique).toBe(true);
      expect(emailIndex[1].unique).toBe(true);
    });
  });
});