const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const morgan = require('morgan');
const dotenv = require('dotenv');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const xss = require('xss-clean');
// const rateLimit = require('express-rate-limit');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorHandler');

//Routers
const userRouter = require('./routes/userRoutes');
const tourRouter = require('./routes/tourRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');
const bookingsRouter = require('./routes/bookingRoutes');

const app = express();
dotenv.config({ path: './config.env' });

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true, limit: '10kb' }));

//hpp parameter pollution
app.use(
  hpp({
    whitelist: ['duration', 'price']
  })
);

//parsing the cookie
app.use(cookieParser());

//security http header
app.use(mongoSanitize());
//for fighting xss attacks
app.use(helmet());

//data input sanitization
// app.use(mongoSanitize());

//xss attacks prevention
app.use(xss());

//using the morgan middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('tiny'));
}

// //rate limiting middleware
// const limiter = rateLimit({
//   max: 100,
//   windowMs: 60 * 60 * 1000,
//   message: 'Too many requests from this Ip.Please try again after 1 hour'
// });
// app.use(limiter);

//Middleware ----express.json() middleware is just a function that provides the body attrib to the express req
app.use(express.json({ limit: '10kb' }));

//Built in middleware to serve static files
//So if we request like this http://localhost:3000/overview.html then the server will understand that this is not a route this is basically we are asking for a file so it will look in the public folder and serve that file
app.use(express.static(path.join(__dirname, 'public')));

//sending the data about all tours
// app.get('/api/v1/tours', getAllTours);

// app.get('/api/v1/tours/:id', getTour);

// //adding the new tour created by the client
// //Now the data posted by the client will be available in the req.body but if you do console.log(req.body) then it will print undefined because in the express req body property is not present so to add that body message we use a middleware which provides the body property in the express request
// app.post('/api/v1/tours', createNewTour);

// //We are not implementing what should happen on a patch request this is just for showing patch request also exists
// app.patch('/api/v1/tours/:id', updateTour);

// //We are not implementing what should happen on a delete request this is just for showing delete request also exists
// app.delete('/api/v1/tours/:id', deleteTour);

app.use('/', viewRouter);

app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingsRouter);

//this middleware is necessary for unhandled routes
//if the request can't be handled by the  above routers then that request will by executed by this middleware
//app.all method means this the callback function will run for every type of request wether it is a get,post,patch or delete
//and * means if the request comes on any route
app.all('*', (req, res, next) => {
  const err = new AppError(`Can't find ${req.originalUrl} on this server`, 404);

  //You can also trace the error stack basically from where the error originated
  console.log(err.stack);

  //whenever you pass an argument in next then automatically our global error middleware will be called
  next(err);
});

//The global error handling middleware
//whenever you create a middleware with four arguments then express will automatically treat it as a global error middleware
app.use(globalErrorHandler);
module.exports = app;
