module.exports = async () => {
  // Set environment variables for tests
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key';
  process.env.PORT = '0'; // Use random port for testing
  
  console.log('Test environment initialized');
};