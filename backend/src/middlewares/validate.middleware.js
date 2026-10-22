const { AppError } = require('./error.middleware');

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body ?? {},
    query: req.query,
    params: req.params,
  });

  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    return next(
      new AppError(
        'Dados de requisição inválidos',
        400,
        'VALIDATION_ERROR',
        details
      )
    );
  }

  req.validated = result.data;
  req.body = result.data.body ?? req.body ?? {};
  req.params = result.data.params ?? req.params;

  return next();
};

module.exports = validate;
