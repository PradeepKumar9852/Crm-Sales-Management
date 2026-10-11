require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // 1. Establish database connection
    await connectDB();

    // 2. Start HTTP server listener
    const server = app.listen(PORT, () => {
      console.log('=========================================');
      console.log(' CRM Sales Management Backend Running');
      console.log(` Port:     ${PORT}`);
      console.log(` Mode:     ${process.env.NODE_ENV || 'development'}`);
      console.log(` Base API: http://localhost:${PORT}/api/v1`);
      console.log(` Docs:     http://localhost:${PORT}/api/v1/docs`);
      console.log('=========================================');
    });

    // 3. Graceful shutdown on unhandled rejections
    process.on('unhandledRejection', (err) => {
      console.error('Unhandled promise rejection. Shutting down gracefully...', err);
      server.close(() => {
        process.exit(1);
      });
    });

    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Catch unexpected exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception detected:', err);
  process.exit(1);
});

startServer();
