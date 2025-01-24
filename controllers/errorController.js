const AppError = require('../utils/appError');

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  // If error is operational (confirmed erorr) - send details
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    console.error('ERROR 💥', err);

    // Otherwise (unnown erorr) - send generic error to not leak any details
    res.status(500).json({
      status: 'error',
      message: 'Oooops... Something went wrong!',
    });
  }
};

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFiledsDB = (err) => {
  const value = err.errmsg.match(/"([^"]*)"/g);
  const message = `Duplicate fields value ${value}. PLease use another value!`;
  return new AppError(message, 400);
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.StatusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };

    // Error handle for invalid DB IDs
    if (err.name === 'CastError') {
      error = handleCastErrorDB(err);
    }

    // Error handle for duplicate fields
    if (err.code === 11000) {
      error = handleDuplicateFiledsDB(err);
    }

    sendErrorProd(error, res);
  }
};
