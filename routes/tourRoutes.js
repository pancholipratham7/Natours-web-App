const express = require('express');

const router = express.Router();
const tourController = require('./../controllers/tourController');
const authController = require('./../controllers/authController');
const reviewRouter = require('./../routes/reviewRoutes');

//Adding a param middleware
//Param middleware is a special type of middleware that executes if there is any parameter in the url
// router.param('id', tourController.checkId);

//Creating Router for handling all tour routes

//This is a alias route
//that means it is a special route
//this special route we have to handle specially because this route will be the most used by the users
//basically this route is for the top 5  tours sorted in descending order of ratingsAvg and if ratings are same then according to the cheaper price
//So behind the scenes we need to change the url like this
//http:localhost:8000/api/v1/tours?limit=5&sort=-ratingsAvg,price
//but we will change just req.query object through a middleware function
//here aliasTopTours will act as a alias

router.use('/:tourId/reviews', reviewRouter);

router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(tourController.getToursWithIn);

router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);
router
  .route('/top-5-cheap')
  .get(tourController.aliasTopTours, tourController.getAllTours);

//router for getting the stats
router.route('/stats').get(tourController.getTourStats);

//router for busiest tour
router
  .route('/getMonthlyPlan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan
  );

router
  .route('/')
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.createNewTour
  );

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour
  )
  .delete(
    // Here adding protect because admin also needs to login first
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour
  );
module.exports = router;
