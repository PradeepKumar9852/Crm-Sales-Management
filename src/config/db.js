const mongoose = require('mongoose');

const MAX_RETRIES = 5;
const RETRY_INTERVAL_MS = 5000;

let isConnected = false;
let retryCount = 0;

/*
  Configure connection event listeners on Mongoose
 */
const setupConnectionEvents = () => {
  mongoose.connection.on('connected', () => {
    isConnected = true;
    retryCount = 0;
    console.log('MongoDB connected successfully');
  });

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB runtime error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    console.warn('MongoDB disconnected. Reconnection will be handled automatically by Mongoose driver.');
  });

  // Handle application termination gracefully
  const gracefulExit = async () => {
    try {
      if (isConnected) {
        await mongoose.connection.close();
        console.log('MongoDB connection closed due to application termination.');
      }
      process.exit(0);
    } catch (err) {
      console.error('Error during graceful shutdown:', err);
      process.exit(1);
    }
  };

  process.once('SIGINT', gracefulExit);
  process.once('SIGTERM', gracefulExit);
};

// Register events once
setupConnectionEvents();

/*
   Connect to MongoDB with retry support
 */
const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI;

  if (!mongoURI) {
    throw new Error('MONGO_URI is missing. Please check your .env file.');
  }

  while (retryCount < MAX_RETRIES) {
    try {
      await mongoose.connect(mongoURI, {
        serverSelectionTimeoutMS: 10000,
      });
      return mongoose.connection;
    } catch (error) {
      retryCount += 1;
      console.error(
        `MongoDB connection attempt ${retryCount}/${MAX_RETRIES} failed: ${error.message}`
      );

      if (retryCount >= MAX_RETRIES) {
        console.error('Maximum MongoDB connection retries exceeded.');
        throw error;
      }

      console.log(`Retrying MongoDB connection in ${RETRY_INTERVAL_MS / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL_MS));
    }
  }
};

module.exports = connectDB;