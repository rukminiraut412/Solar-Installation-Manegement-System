/**
 * Operations App Wrapper for Testing & Standalone Verification
 * Configures complete Express pipeline including security headers, CORS, body parsers,
 * Member 1's shared middleware, and mounts /api/v1/operations without mutating server/src/app.js.
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from '../../config/env.js';
import { notFoundHandler } from '../../middleware/notFoundHandler.js';
import { errorHandler } from '../../middleware/errorHandler.js';
import authRouter from '../auth/auth.routes.js';
import mediaRouter from '../../shared/routes/media.routes.js';
import operationsRouter from './operations.routes.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

const apiRouter = express.Router();
apiRouter.use('/auth', authRouter);
apiRouter.use('/media', mediaRouter);
apiRouter.use('/operations', operationsRouter);

app.use('/api/v1', apiRouter);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/api/v1/health', (req, res) => res.json({ status: 'ok' }));

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
