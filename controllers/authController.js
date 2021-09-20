const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { promisify } = require('util');

const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const Email = require('./../utils/sendEmail');

const signToken = function(id) {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

const createTokenSendResponse = (user, statusCode, res) => {
  const token = signToken(user._id);

  //Cookie implementation
  const cookieOptions = {
    //setting the expiry date of cookie same as jwt
    expire: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    // //by using this option the cookie will be sent only when you use https
    // secure: true,
    //by using this option the browser can only store and send the cookie can't edit
    httpOnly: true
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  user.password = undefined;
  res.cookie('jwt', token, cookieOptions);
  res.status(statusCode).json({
    status: 'success',
    token,
    user
  });
};

//Function for controlling signing up of users.....!
exports.signUp = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    role: req.body.role
  });

  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();

  createTokenSendResponse(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  //Check whether the email password exists or not
  if (!email || !password) {
    return next(new AppError('Enter both email and password...!', 400));
  }

  //Check if user exists and if password is correct or not
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Either email or password is incorrect...!', 401));
  }
  createTokenSendResponse(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  //If the token exists or not
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token) {
    return next(new AppError('You are not logged In.Please log In', 401));
  }

  //Verifying token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //Check whether user exists or not
  const freshUser = await User.findOne({ _id: decoded.id });
  if (!freshUser) {
    return next(
      new AppError('The user belonging to this token no longer exist..!', 401)
    );
  }

  //Checking whether the password was change after the token was issued
  //this means that the users want to change his password because some hacker has hacked his webtoken so he wants to change his password and get a new token
  if (freshUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError(
        'User recently changed Password..Please login again....!',
        401
      )
    );
  }

  //this we will use afterwards
  req.user = freshUser;
  res.locals.user = freshUser;
  next();
});

// Only for rendered pages, no errors!
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1) verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          "You don't have permission to access the resourse....!",
          403
        )
      );
    }
    next();
  };
};

//PASSWORD RESET FUNCTIONALITY
exports.forgotPassword = catchAsync(async (req, res, next) => {
  //If the user exists or not
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    next(new AppError('There is no user with this email address...!'), 401);
  }
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  //Sending token and password reset link using Email
  const resetUrl = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;

  try {
    // await sendEmail({
    //   email: user.email,
    //   subject: 'Your password reset token(valid for 10 min)',
    //   message
    // });
    await new Email(user, resetUrl).sendPasswordReset();
    res.status(200).json({
      status: 'success',
      message: 'Token sent to email'
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError(
        'There was an error sending the mail Please Try again...!',
        500
      )
    );
  }
});
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) Update changedPasswordAt property for the user
  // 4) Log the user in, send JWT
  createTokenSendResponse(user, 200, res);
});

//Here we are creating a update password function
//If the user has not forgotten the old password but just want to update thier password in a simple manner without that reset token
exports.updatePassword = catchAsync(async (req, res, next) => {
  //finding user in the collection
  //checking if posted current password is correct or not
  const user = await User.findById({ _id: req.user._id }).select('+password');
  console.log(req.body.currentPassword, user.password);
  if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
    return next(new AppError('Your current Password is wrong', 401));
  }

  //Updating the password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  //PasswordchangedAt property will already change due to pre save middleware running see in the model
  //sending a new token.....
  createTokenSendResponse(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({ status: 'success' });
};
