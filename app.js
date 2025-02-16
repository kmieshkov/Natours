const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const nocache = require('nocache');
const cors = require('cors');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');
const bookingRouter = require('./routes/bookingRoutes');

const app = express();

// Init views
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

/********* Middleware *********/

// Implement CORS
app.use(cors());
app.options('*', cors());

// Serving static files
app.use(express.static(path.join(__dirname, 'public')));

app.use(nocache());

// Set security HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  }),
);

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
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitazation agains NoSQL query injections
app.use(mongoSanitize());

// Data sanitazation against XSS
app.use(xss());

// Prevent HTTP parameter polution
app.use(
  hpp({
    // Allow duplicate fields in query params
    whitelist: ['duration', 'ratingsAverage', 'maxGroupSize', 'difficulty', 'price'],
  }),
);

app.use(compression());

// Test middleware, applies to each request
app.use((req, res, next) => {
  // console.log('Query ＞:'. req.query);
  // console.log('Cookies 🍪:', req.cookies);
  req.requestTime = new Date().toISOString();
  next();
});

/********* Routes *********/

app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

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
