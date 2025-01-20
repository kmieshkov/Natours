const express = require('express');
const morgan = require('morgan');

const app = express();
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');

/********* Middleware *********/

app.use(morgan('dev'));
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

module.exports = app;
