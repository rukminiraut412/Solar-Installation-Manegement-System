import { AppError } from '../shared/errors/AppError.js';
import { errorResponse } from '../shared/utils/response.js';
import { ZodError } from 'zod';

export function errorHandler(err, req, res, next) {
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return errorResponse(res, 'Validation failed', 422, 'VALIDATION_ERROR', formattedErrors);
  }

  // Handle known AppErrors
  if (err instanceof AppError) {
    return errorResponse(res, err.message, err.statusCode, err.code, err.details);
  }

  // Handle JSON parse errors from body-parser
  if (err.type === 'entity.parse.failed') {
    return errorResponse(res, 'Invalid JSON payload received', 400, 'BAD_REQUEST');
  }

  // Handle unhandled unexpected errors
  console.error('[Unhandled Error]', err);
  const isProduction = process.env.NODE_ENV === 'production';
  return errorResponse(
    res,
    isProduction ? 'Internal Server Error' : err.message,
    500,
    'INTERNAL_ERROR',
    isProduction ? null : { stack: err.stack }
  );
}
