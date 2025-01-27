const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const signToken = function (id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role,
  });

  const token = signToken(newUser._id);

  res.status(201).json({
    status: 'success',
    token,
    data: {
      user: newUser,
    },
  });
});

exports.signin = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1. Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  // 2. Check if user exests && password is correct
  const user = await User.findOne({ email: email }).select('+password'); // Include password field in the query, as it is excluded by default in the schema

  // 3. Check if user exists and verify password
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // 4. If validation pass - send token in response
  const token = signToken(user._id);

  res.status(200).json({
    status: 'success',
    token,
  });
});

exports.protect = catchAsync(async (req, res, next) => {
  // 1. Get token and check if it exists
  let token;
  if (req.headers.authorization && req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('You are not logged in! PLease login to get access', 401));
  }
  // 2. Token verification
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3. Check if user who is trying to acces the rout is still exists
  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return next(new AppError('The user belonging to the token no longer exist', 401));
  }

  // 4. Check if user changed password after JWT was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(new AppError('User recently changed password! Please log in again', 401));
  }

  // Grant access to protected route
  // Store in req.user to access in middleware that is used after protect (this) middleware
  req.user = currentUser;
  next();
});

// Wrapper for middleware fn to pass arbitrary number of params inside middleware fn
exports.restrictTo = (...roles) => {
  return catchAsync(async (req, res, next) => {
    // Check if user is in allowed user rolses (passed in params)
    if (!roles.includes(req.user.role)) {
      console.log('!!!!!!');
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  });
};
