import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env.js';
import { successResponse } from './shared/utils/response.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRouter from './modules/auth/auth.routes.js';
import mediaRouter from './shared/routes/media.routes.js';

const app = express();

// Security HTTP headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      const allowedOrigins = [env.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'];
      if (allowedOrigins.includes(origin) || env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(new Error('CORS not allowed from origin: ' + origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request logging (skip in test mode to keep test output clean)
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check endpoints
const healthCheckHandler = (req, res) => {
  return successResponse(res, {
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    service: 'Solar Installation Management System API',
    version: '1.0.0',
    environment: env.NODE_ENV,
  }, 'Service healthy');
};

app.get('/health', healthCheckHandler);
app.get('/api/health', healthCheckHandler);
app.get('/api/v1/health', healthCheckHandler);

// API router placeholder for future phases & members
const apiRouter = express.Router();

// Mount Platform Foundation Auth module
apiRouter.use('/auth', authRouter);

// Mount Platform Foundation Shared Media Upload module
apiRouter.use('/media', mediaRouter);

// Mount API router
app.use('/api/v1', apiRouter);

// 404 and Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
