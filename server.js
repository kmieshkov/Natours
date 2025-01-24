const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: `${__dirname}/config.env` });

const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('DB connection successful!');
  });

const app = require('./app');

const port = process.env.PORT || 8000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

// Global error handling for Unhandled Promise Rejections and Uncaught Exceptions

// Unhandled rejections: Shutting down is recommended to ensure reliability and catch missed errors
process.on('unhandledRejection', (err) => {
  console.log('UNHADNDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);

  // Allow server to finish handling pending requests before shutting down
  server.close(() => {
    process.exit(1);
  });
});

// Uncaught exceptions: Must shut down the app to avoid running in a corrupted state
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.log(err.name, err.message);

  // Allow server to finish handling pending requests before shutting down
  server.close(() => {
    process.exit(1);
  });
});
