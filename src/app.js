require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');

const validateEnv = require('./config/env');
const apiRoutes = require('./routes');
const swaggerSpec = require('./docs/swagger');
const { apiLimiter } = require('./middlewares/rateLimiter.middleware');
const { notFoundHandler, globalErrorHandler } = require('./middlewares/error.middleware');

// Validate critical environment variables on startup
validateEnv();

const app = express();

// 1. Basic Security Headers (disable CSP so Swagger UI renders properly)
app.use(helmet({ contentSecurityPolicy: false }));

// 2. CORS Setup
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Blocked by CORS policy'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// 3. Request Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 4. Rate Limiter on API routes
app.use('/api', apiLimiter);

// 5. Interactive Swagger UI Documentation
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));

app.get('/api/v1/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// 6. Root & Health Check
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CRM Sales Management API is active',
    version: '1.0.0',
    documentation: '/api/v1/docs',
  });
});

app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'System is healthy',
    data: {
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    },
  });
});

// 7. Mount Main API Routes
app.use('/api/v1', apiRoutes);

// 8. 404 Handler for undefined routes
app.use(notFoundHandler);

// 9. Centralized Error Handler
app.use(globalErrorHandler);

module.exports = app;
