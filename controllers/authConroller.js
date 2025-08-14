const { promisify } = require('util');
const User = require('../models/userModel');
const AppError = require('../utils/apiError');
const catchAsync = require('../utils/catchAsync');

const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/email');
const crypto = require('crypto');

const signinToken = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signinToken(user._id);
  const timestamp = Date.now();
  const cookiesOptions = {
    expires: timestamp + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 60,
    httpOnly: true,
  };
  res.cookie('jwt', token);
  if (process.env.NODE_ENV === 'PRODUCTION') cookiesOptions.secure = true;

  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token: token,
    user,
  });
};

exports.signUp = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    changedPasswordAt: req.body.changedPasswordAt,
    role: req.body.role,
  });

  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  // console.log(email, password);
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 401));
  }
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('invalid credials!', 401));
  }
  createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  // console.log(token);
  if (!token) {
    return next(new AppError('unauthorized', 401));
  }
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const freshUser = await User.findById(decoded.id);
  // console.log(freshUser);
  if (!freshUser) {
    return next(
      new AppError('User that belong this token is no longer exist....', 401)
    );
  }
  const changedPassword = freshUser.changedPassword(decoded.iat);
  if (changedPassword) {
    return next(
      new AppError('password has been chagned please login again...', 401)
    );
  }
  req.user = freshUser;
  next();
});

exports.restrictTo = (...roles) => {
  return async (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('there is no user with that email', 404));
  }
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/resetPassword/${resetToken}`;
  const message = `Forgot your password ? submit a PATCH req to reset your password ${resetURL} `;
  // console.log('resetToem from controller', resetToken);

  try {
    await sendEmail({
      email: user.email,
      subject: `your password reset token ${message} (valid for 10 min)`,
      message: `${message} `,
    });
    res.status(200).json({
      status: 'success',
      message: 'Token sent to email',
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    console.log('cateched error', error);
    await user.save({ validateBeforeSave: false });
    return next(new AppError('something went wrong', 500));
  }
});
exports.resetPassword = catchAsync(async (req, res, next) => {
  // next();
  console.log('req.params.token....', req.params.token);
  const hashedToken = crypto
    .createHash('shake256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    // email: req.body.email,
    passwordResetToken: hashedToken,
    // passwordResetExpires: { $gt: Date.now() },
  });
  if (!user) {
    return next(new AppError('Token is invalid or expaired', 400));
  }

  // console.log('req.passwordConfirm...', req.passwordConfirm);
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;

  user.passwordResetExpires = undefined;
  user.passwordResetToken = undefined;
  await user.save();

  createSendToken(user, 200, res);

  // const resetToken = user.createPasswordResetToken();
  // console.log('resetToem from controller', resetToken);
  // user.save({ validateBeforeSave: false });
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // console.log(req.user);
  const user = await User.findOne({ email: req.user.email }).select(
    '+password'
  );

  if (!user) {
    return next(new AppError('unaothorired', 401));
  }
  if (!(await user.correctPassword(req.body.password, user.password))) {
    return next(new AppError('your password is invalid', 400));
  }

  user.password = req.body.newPassword;
  user.passwordConfirm = req.body.newPasswordConfirm;

  await user.save();

  const token = signinToken(user._id);

  res.status(200).json({
    status: 'success',
    token: token,
    user,
  });
});
