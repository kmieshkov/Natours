const express = require('express');
const morgan = require('morgan');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');

const app = express();

/********* Middleware *********/

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(express.json()); // Modify incoming data
app.use(express.static(`${__dirname}/public`)); // Serve static files

// Middleware, applies to each request
app.use((req, res, next) => {
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
