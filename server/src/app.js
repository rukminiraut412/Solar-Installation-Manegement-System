import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middleware/error.middleware.js';

// Dynamically import or mount support-finance router
import supportFinanceRoutes from './modules/support-finance/routes.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));

// Capture raw body for Razorpay webhook verification
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Solar Installation Management & Intelligence Platform',
    timestamp: new Date().toISOString()
  });
});

// Member 4 - Support, Finance and AI routes
app.use('/api/v1/support-finance', supportFinanceRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;
