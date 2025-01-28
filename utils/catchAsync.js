// A utility function for async route handlers that simplifies code
// by eliminating repetitive try-catch blocks
// - Accepts an async function (fn) and returns a new function wrapping it with a .catch() handler.
// - Catches errors and forwards them to Express error-handling middleware via next(err)
const catchAsync = function (fn) {
  return (req, res, next) => {
    // eslint-disable-next-line arrow-body-style
    fn(req, res, next).catch((err) => {
      return next(err);
    });
  };
};

module.exports = catchAsync;
