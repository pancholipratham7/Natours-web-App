const AppError = require('./../utils/appError');

const handleDuplicateFieldsDb = err => {
  const value = err.errmsg.match(/(["'])(?:\\.|[^\\])*?\1/);
  const message = `Duplicate field value:${value},Please use another value....!`;
  return new AppError(message, 400);
};

const handleValidationError = err => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJsonWebTokenError = function() {
  return new AppError('Invalid Token...!Please Login again....!', 401);
};

const handleTokenExpiredError = function() {
  return new AppError(
    'This token No longer exists Please Login again...!',
    401
  );
};

const sendErrorDev = (err, req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      error: err,
      stack: err.stack
    });
  }

  res
    .status(err.statusCode)
    .set(
      'Content-Security-Policy',
      "default-src 'self';script-src * 'unsafe-inline';font-src *;style-src 'self' fonts.googleapis.com 'unsafe-inline' 'unsafe-hashes';img-src *;connect-src *"
    )
    .render('error', {
      title: 'Something Went Wrong..!',
      msg: err.message
    });
};

// Handling Cast Error
const handleCastErrorDB = err => {
  const message = `Invalid ${err.path}:${err.value}`;
  return new AppError(message, 400);
};

const sendErrorProd = (err, req, res) => {
  // A) API
  if (req.originalUrl.startsWith('/api')) {
    // A) Operational, trusted error: send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    }
    // B) Programming or other unknown error: don't leak error details
    // 1) Log error
    console.error('ERROR 💥', err);
    // 2) Send generic message
    return res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!'
    });
  }

  // B) RENDERED WEBSITE
  // A) Operational, trusted error: send message to client
  if (err.isOperational) {
    console.log(err);
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message
    });
  }
  // B) Programming or other unknown error: don't leak error details
  // 1) Log error
  console.error('ERROR 💥', err);
  // 2) Send generic message
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: 'Please try again later.'
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'failed';
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    if (err.name === 'CastError') {
      err = handleCastErrorDB(err);
    } else if (err.code === 11000) {
      err = handleDuplicateFieldsDb(err);
    } else if (err.name === 'ValidationError') {
      err = handleValidationError(err);
    } else if (err.name === 'JsonWebTokenError') {
      err = handleJsonWebTokenError();
    } else if (err.name === 'TokenExpiredError') {
      err = handleTokenExpiredError();
    }
    sendErrorProd(err, req, res);
  }
};
