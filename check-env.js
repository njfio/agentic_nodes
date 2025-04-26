require('dotenv').config();

console.log('Environment variables:');
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('MONGODB_URI:', process.env.MONGODB_URI);
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 
  `${process.env.OPENAI_API_KEY.substring(0, 5)}...${process.env.OPENAI_API_KEY.substring(process.env.OPENAI_API_KEY.length - 4)}` : 
  'Not set');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Set (hidden)' : 'Not set');
