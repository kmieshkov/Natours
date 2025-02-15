const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

const signToken = function (id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createAndSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    // Days in ms
    expiresIn: new Date(Date.now() + process.env.JWT_EXPIRES_IN * 24 * 60 * 60 * 1000),

    // Cookie cannot be accessed or modified in any way by the browser
    httpOnly: true,

    // Cookie only will be sent in encypted connections - https
    secure: process.env.NODE_ENV === 'production',
  };

  // Set jwt cookie
  res.cookie('jwt', token, cookieOptions);

  // Remove password from res output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
  });

  const url = `${req.protocol}://${req.get('host')}/profile`;
  await new Email(newUser, url).sendWelcome();

  createAndSendToken(newUser, 201, res);
});

exports.signin = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1. Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  // 2. Check if user exests && password is correct
  // Include password field in the query, as it is excluded by default in the schema
  const user = await User.findOne({ email: email }).select('+password');

  // 3. Check if user exists and verify password
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // 4. If validation pass - send token in response
  createAndSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.clearCookie('jwt');

  res.status(200).json({
    status: 'success',
  });
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1. Get token and check if it exists
  let token;
  if (req.headers.authorization && req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError('You are not logged in! Please login to get access', 401));
  }
  // 2. Token verification
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET).catch(() => false);

  if (!decoded) {
    return next(new AppError('Error decoding JWT', 401));
  }

  // 3. Check if user who is trying to acces the route still exists
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
  res.locals.user = currentUser; // Each .pug will have access to 'locals'
  next();
});

// Only for rendered pages, no errors
exports.isLoggedIn = catchAsync(async (req, res, next) => {
  const token = req.cookies.jwt;
  if (token) {
    try {
      // 1. Verify token
      const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET).catch(() => false);

      if (!decoded) {
        return next();
      }

      // 2. Check if user who is trying to acces the rout is still exists
      const currentUser = await User.findById(decoded.id);

      if (!currentUser) {
        return next();
      }

      // 3. Check if user changed password after JWT was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // There is a Logged In user
      res.locals.user = currentUser; // Each .pug will have access to 'locals'
    } catch (error) {
      return next();
    }
  }
  next();
});

// Wrapper for middleware fn to pass arbitrary number of params inside middleware fn
exports.restrictTo = (...roles) =>
  catchAsync(async (req, res, next) => {
    // Check if user is in allowed user rolses (passed in params)
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }

    next();
  });

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1. Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with provided email', 404));
  }

  // 2. Generate random token
  const resetToken = user.createPasswordResetToken();
  // Turn off validation, because only email is expected in req.body
  await user.save({ validateBeforeSave: false });

  // 3. Send it back as an email
  const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/reset-password/${resetToken}`;

  try {
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (error) {
    console.log(error);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError('There was an error sending the email. Try again later!'), 500);
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1. Get user from collection
  // Since we sent not encrypted token, we need to encrypt it, and compare to encrypted one in DB
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  // Find user by token and check if the token is not expired
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2. Set the new password if there is a user, and token has not expired
  if (!user) {
    return next(new AppError('Token is invalid or expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3. Update change passwordChangedAt property for user
  // Implemented in userSchema.pre middleware

  // 4. Log the user on, send JWT
  createAndSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1. Get user from collection
  // Since it's a protected route - the id is already stored in request
  const user = await User.findById(req.user.id).select('+password');

  // 2. Check if current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong!', 401));
  }

  // 3. Update the password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // User.findByIdAndUpdate won't work as intended:
  // validation works on 'save';
  // 'create' only and all passsword middleware works only on 'save' events

  // 4. Log user in with new password, send JWT
  createAndSendToken(user, 200, res);
});
