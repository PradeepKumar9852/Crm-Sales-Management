const AppError = require('../utils/appError');

/**
 * Validate request data against a Zod schema
 * @param {import('zod').ZodSchema | { body?: import('zod').ZodSchema, query?: import('zod').ZodSchema, params?: import('zod').ZodSchema }} schema
 * @param {'body'|'query'|'params'} [defaultSource='body']
 */
const validate = (schema, defaultSource = 'body') => {
  return (req, res, next) => {
    // If the schema object explicitly has body, query, or params keys with Zod objects
    const hasTargetKeys =
      schema &&
      typeof schema === 'object' &&
      (schema.body || schema.query || schema.params);

    if (hasTargetKeys) {
      const targets = ['body', 'query', 'params'];
      const errors = [];

      for (const target of targets) {
        if (schema[target]) {
          const result = schema[target].safeParse(req[target]);
          if (!result.success) {
            result.error.issues.forEach((issue) => {
              errors.push({
                source: target,
                field: issue.path.join('.'),
                message: issue.message,
              });
            });
          } else {
            req[target] = result.data;
          }
        }
      }

      if (errors.length > 0) {
        return next(new AppError('Validation failed', 400, errors));
      }

      return next();
    }

    // Direct schema applied to defaultSource
    if (schema && typeof schema.safeParse === 'function') {
      const result = schema.safeParse(req[defaultSource]);
      if (!result.success) {
        const formattedErrors = result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));
        return next(new AppError('Validation failed', 400, formattedErrors));
      }
      req[defaultSource] = result.data;
      return next();
    }

    next();
  };
};

module.exports = validate;
