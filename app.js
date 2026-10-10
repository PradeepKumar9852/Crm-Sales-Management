require('dotenv').config();
const validateEnv = require('./src/config/env');
validateEnv();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const apiRoutes = require('./src/routes');
const { apiLimiter } = require('./src/middlewares/rateLimiter.middleware');
const { notFoundHandler, globalErrorHandler } = require('./src/middlewares/error.middleware');

const app = express();

// 1. Security Headers (CSP disabled to allow Swagger UI interactive interface)
app.use(helmet({ contentSecurityPolicy: false }));

// 2. CORS Configuration
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
      return callback(new Error('CORS policy: Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// 3. Request Body & Cookie Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 4. Rate Limiting for all API routes
app.use('/api', apiLimiter);

// 5. Swagger Interactive API Documentation
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./src/docs/swagger');

app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
app.get('/api/v1/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// 6. System Health Check & Root Route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CRM Sales Management API is running',
    version: '1.0.0',
    documentation: '/api/v1/docs',
    swaggerJson: '/api/v1/docs.json',
  });
});

app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'System is healthy',
    data: {
      uptimeSeconds: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    },
  });
});

// 7. Mount Master API v1 Router
app.use('/api/v1', apiRoutes);

// 8. 404 Not Found Handler for Unmatched Routes
app.use(notFoundHandler);

// 9. Centralized Global Error Handler
app.use(globalErrorHandler);

module.exports = app;