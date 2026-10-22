class AppError extends Error {
  constructor(message, statusCode = 400, code = null, details = []) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errorCode = code;
    this.details = details;
  }

  get code() {
    return this.errorCode || {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
    }[this.statusCode] || 'INTERNAL_SERVER_ERROR';
  }
}

const errorMiddleware = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const statusCodes = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
  };
  const code = err.code || statusCodes[statusCode] || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'Erro interno no servidor.';
  const details = err.details || [];

  if (statusCode === 500) {
    console.error('[CRITICAL_ERROR]', err);
  }

  return res.status(statusCode).json({
    success: false,
    message,
    error: { code, message, details },
    timestamp: new Date().toISOString(),
  });
};

errorMiddleware.AppError = AppError;

module.exports = errorMiddleware;