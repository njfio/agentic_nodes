require('dotenv').config();
const mongoose = require('mongoose');

console.log('Checking MongoDB connection...');
console.log(`MongoDB URI: ${process.env.MONGODB_URI}`);

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connection successful!');
    
    // List all collections
    mongoose.connection.db.listCollections().toArray()
      .then(collections => {
        console.log('Available collections:');
        collections.forEach(collection => {
          console.log(`- ${collection.name}`);
        });
        
        // Close the connection
        mongoose.connection.close();
        console.log('Connection closed.');
      })
      .catch(err => {
        console.error('Error listing collections:', err);
        mongoose.connection.close();
      });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
