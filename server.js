const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: `${__dirname}/config.env` });
const app = require('./app');

const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);

// Uncaught Exceptions: Must shut down the app to avoid running in a corrupted state
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

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

const port = process.env.PORT || 8000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

// Unhandled Rejections: Shutting down is recommended to ensure reliability and catch missed errors
process.on('unhandledRejection', (err) => {
  console.log('UNHADNDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);

  // Allow server to finish handling pending requests before shutting down
  server.close(() => {
    process.exit(1);
  });
});
