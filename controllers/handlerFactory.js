const AppError = require('../utils/appError');
const catchAsync = require('./../utils/catchAsync');
const ApiFeatures = require('./../utils/apiFeatures');

exports.deleteOne = Model =>
  catchAsync(async function(req, res, next) {
    const doc = await Model.findByIdAndDelete(req.params.id);
    //during the delete request we setup the status code to 204 which means no content/response will be returned because during the delete request no data is sent back from an api
    if (!doc) return next(new AppError('No document found with that ID', 404));
    res.status(204).json({
      status: 'success',
      //data is null because we don't send any data .
      data: null
    });
  });

exports.updateOne = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        doc
      }
    });
  });

exports.createOne = Model =>
  catchAsync(async function(req, res, next) {
    //201 status code is for creating something
    const doc = await Model.create(req.body);
    res.status(201).json({
      status: 'success',
      data: {
        doc
      }
    });
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async function(req, res, next) {
    let query = Model.findById(req.params.id);
    if (popOptions) query = query.populate(popOptions);
    const doc = await query;

    if (!doc) {
      return next(new AppError('No document Found With that Id', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        doc
      }
    });
  });

exports.getAll = Model =>
  catchAsync(async function(req, res, next) {
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };
    const features = new ApiFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    // const queryObj = { ...req.query };
    // const excludedFields = ['sort', 'page', 'limit', 'fields'];

    // //Deleting this excluded fields from the queryObj
    // excludedFields.forEach(el => delete queryObj[el]);

    // //and also converting the js object to a string
    // let queryStr = JSON.stringify(queryObj);

    // //Advance Filtering of the api....!
    // //So here we will also add filtering for less than type operators
    // //the url will be like this localhost:8000/api/v1/tours?duration[lt]=3&difficulty=easy
    // //so express will directly provide a this in req.query as
    // // {
    // //   duration: { lt: 3 },
    // //   difficulty:"easy"
    // // }
    // //replacing gt,gte,lt,lte with $gt etc respectively from the queryObj string
    // queryStr = queryStr.replace(/\b(gt|gte|lt|lte)\b/g, match => `$${match}`);

    // //First here we will creating the query because we want to chain all methods like sort etc to this query because sort method is a method of query object
    // //find method just returns a query (A mongoose query class instance which has some special methods like sort which we can chain on it)
    // //Building the query
    // let query = Tour.find(JSON.parse(queryStr));

    //adding some more functionality to the query
    //So for this sort functionality url will be like http://localhost:8000/api/v1/tours?duration[gt]=4&difficulty=easy&sort=price,ratingsAvg
    //if you provide sort=-price that - in query.sort will mean that we need to sort in descending order and if minus is not present then it will sort in dscending order
    // if (req.query.sort) {
    //   const sortBy = req.query.sort.split(',').join(' ');
    //   query = query.sort(sortBy);
    // } else {
    //   query = query.sort('-createdAt');
    // }

    // //Limiting the fields....
    // //Why there is a need to limit the fields...?
    // //we need to limit the fileds that arrives in the document from the database because then less data will be there and it will be more efficient
    // //We limit the fields in order to get the fields  only we want not the unnecessary fields
    // //so we mention the field paramter in the query string in the  url like fields=name,price,rating
    // if (req.query.fields) {
    //   const fieldStr = req.query.fields.split(',').join(' ');
    //   //making the query which will only retrieve these fields from the database
    //   query = query.select(fieldStr);
    // } else {
    //   //for the default case we want to exclude some fields
    //   //now here whenever you create some data in the database then always mongoose create _v field which mongoose uses internally but we can exclude it from output
    //   //-sign will exclude it from output
    //   query = query.select('-__v');
    // }

    // //Implementing pagination
    // const page = req.query.page * 1 || 1;
    // const limit = req.query.limit * 1 || 100;
    // const skip = (page - 1) * limit;
    // //skip method for how many results you want to skip and limit is how many results you want to show
    // query = query.skip(skip).limit(limit);

    // //Checking if the page exists or not
    // if (req.query.page) {
    //   const totalTours = await Tour.countDocuments();
    //   if (skip >= totalTours) {
    //     throw new Error("Page doesn't exist");
    //   }
    // }

    //when we write await query that query is basically executed that means that it is send to the databse server and then finally the document arrives
    //Executing the query
    const docs = await features.query;

    //Sending the response
    res.status(200).json({
      status: 'success',
      results: docs.length,
      data: {
        tours: docs
      }
    });
  });
