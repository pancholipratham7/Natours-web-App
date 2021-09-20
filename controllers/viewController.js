const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('./../utils/appError');
const User = require('./../models/userModel');
const Booking = require('./../models/bookingModel');

exports.getOverview = catchAsync(async (req, res, next) => {
  //getting the tours from database
  const tours = await Tour.find();

  //Building the overview.pug template see that template

  //passing tour to the template
  res
    .status(200)
    .set(
      'Content-Security-Policy',
      "default-src 'self';script-src * 'unsafe-inline';font-src *;style-src 'self' fonts.googleapis.com 'unsafe-inline' 'unsafe-hashes';img-src *;connect-src *"
    )
    .render('overview', {
      title: 'All tours',
      tours
    });
});
exports.getTour = catchAsync(async (req, res, next) => {
  //getting the tour data and populating reviews
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review rating user'
  });
  if (!tour) {
    return next(new AppError('There is no tour with that name', 404));
  }
  console.log(tour.reviews[0].user);
  res
    .status(200)
    .set(
      'Content-Security-Policy',
      "default-src 'self' https://*.mapbox.com https://js.stripe.com/v3/; base-uri 'self';block-all-mixed-content;font-src 'self' https: data:;frame-ancestors 'self';img-src * data:;object-src 'none';script-src https://cdnjs.cloudflare.com https://api.mapbox.com https://js.stripe.com/v3/ 'self' blob: ;script-src-attr 'none';frame-src *;style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests;connect-src *"
    )
    .render('tour', {
      title: tour.name,
      tour
    });
});
exports.getLoginForm = (req, res, next) => {
  res
    .status(200)
    .set(
      'Content-Security-Policy',
      "default-src 'self';script-src *;font-src *;style-src 'self' https: 'unsafe-inline' 'unsafe-hashes';connect-src *"
    )
    .render('loginForm', {
      title: 'Log In'
    });
};

exports.logOut = (req, res, next) => {
  res.cookie('jwt', 'Logged out', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({
    status: 'success'
  });
};

exports.getMe = (req, res, next) => {
  res
    .status(200)
    .set(
      'Content-Security-Policy',
      "default-src 'self';script-src * 'unsafe-inline';font-src *;style-src 'self' fonts.googleapis.com 'unsafe-inline' 'unsafe-hashes';img-src *;connect-src *"
    )
    .render('myAccount', {
      title: 'My Account'
    });
};

exports.updateUserData = async (req, res, next) => {
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      name: req.body.name,
      email: req.body.email
    },
    {
      new: true,
      runValidators: true
    }
  );
  res
    .status(200)
    .set(
      'Content-Security-Policy',
      "default-src 'self';script-src * 'unsafe-inline';font-src *;style-src 'self' fonts.googleapis.com 'unsafe-inline' 'unsafe-hashes';img-src *;connect-src *"
    )
    .render('myAccount', {
      title: 'My Account',
      user: updatedUser
    });
};

exports.getMyBookings = async (req, res, next) => {
  const bookings = await Booking.find({ user: req.user._id });
  const tourIDs = bookings.map(el => el.tour);

  const tours = await Tour.find({ _id: { $in: tourIDs } });

  res.status(200).render('overview', {
    title: 'My Booking',
    tours
  });
};
