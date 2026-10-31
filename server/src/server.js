import app from './app.js';
import { env } from './config/env.js';

const PORT = env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`[SunPower Solutions API] Server running in ${env.NODE_ENV} mode on port ${PORT}`);
  console.log(`[SunPower Solutions API] Health check available at http://localhost:${PORT}/health`);
});

// Graceful shutdown handling
const handleShutdown = (signal) => {
  console.log(`\n[SunPower Solutions API] ${signal} signal received. Closing HTTP server...`);
  server.close(() => {
    console.log('[SunPower Solutions API] HTTP server closed gracefully.');
    process.exit(0);
  });

  // Force shutdown after 10s timeout
  setTimeout(() => {
    console.error('[SunPower Solutions API] Force shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
