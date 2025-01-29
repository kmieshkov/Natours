const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');

const app = express();

/********* Middleware *********/

// Set security HTTP headers
app.use(helmet());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit requests from same IP (N requests in M milliseconds)
// Resets after server restarts
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP. Please try again in an hour!',
});
app.use('/api', limiter);

// Body parser, reading data from body into req.body. Limit body to 10 kb
app.use(express.json({ limnit: '10kb' }));

// Serving static files
app.use(express.static(`${__dirname}/public`));

// Test middleware, applies to each request
app.use((req, res, next) => {
  // console.log(req.headers);
  console.log('Hello from middleware 🖖');
  req.requestTime = new Date().toISOString();
  next();
});

/********* Routes *********/

app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);

/********* Error handling Middleware *********/

// If code went up to this point - then we don't have an implementation
// An error response will be sent for these scenarios

// For all URLs that don't have an implemented API
app.all('*', (req, res, next) => {
  // Passing anything to next() signals an error and skips to error-handling middleware
  next(new AppError(`Cannot find ${req.method} ${req.originalUrl} on this server`, 404));
});

// Shared error response
app.use(globalErrorHandler);

module.exports = app;
