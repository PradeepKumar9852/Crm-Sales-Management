require('dotenv').config();
const app = require('./app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Start HTTP listener
    const server = app.listen(PORT, () => {
      console.log('=========================================');
      console.log(' CRM Sales Management Server Running ');
      console.log(` Port: ${PORT}`);
      console.log(` Mode: ${process.env.NODE_ENV || 'development'}`);
      console.log(` Base API: http://localhost:${PORT}/api/v1`);
      console.log('=========================================');
    });

    // 3. Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      console.error('UNHANDLED REJECTION! Shutting down gracefully...', err);
      server.close(() => {
        process.exit(1);
      });
    });

    return server;
  } catch (error) {
    console.error('Server failed to start:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down...', err);
  process.exit(1);
});

startServer();
