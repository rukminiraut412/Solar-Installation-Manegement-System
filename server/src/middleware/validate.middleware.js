import { ValidationError } from '../shared/errors/AppError.js';

/**
 * Reusable Zod validation middleware for Express
 * Validates req.body, req.query, or req.params
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const dataToValidate = req[source];
    const result = schema.safeParse(dataToValidate);

    if (!result.success) {
      const details = result.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return next(new ValidationError('Input validation failed', details));
    }

    req[source] = result.data;
    next();
  };
}
