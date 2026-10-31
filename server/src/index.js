import app from './app.js';
import { ENV } from './config/env.js';

const PORT = ENV.PORT;

app.listen(PORT, () => {
  console.log(`[SUNPOWER-API] Server running on port ${PORT} in ${ENV.NODE_ENV} mode`);
  console.log(`[SUNPOWER-API] Health check: http://localhost:${PORT}/api/v1/health`);
  console.log(`[SUNPOWER-API] Support & Finance API: http://localhost:${PORT}/api/v1/support-finance/health`);
});
