export const errorHandler = (err, req, res, next) => {
  console.error('[SERVER-ERROR]', err);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred',
      details: err.details || null,
      requestId: req.headers['x-request-id'] || `req-${Date.now()}`
    }
  });
};
