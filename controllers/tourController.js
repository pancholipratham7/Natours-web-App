const multer = require('multer');
const sharp = require('sharp');
const AppError = require('../utils/appError');
const Tour = require('./../models/tourModel');
const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerFactory');

// class ApiFeatures {
//   constructor(query, queryString) {
//     this.query = query;
//     this.queryString = queryString;
//   }
//   filter() {
//     //Consider a url---http://localhost:8000/api/v1/tours?price=200&ratings=4;
//     //after the question mark that part is called queryString which consists of parameters
//     //And this parameter is basically used to filter the api
//     //req.query provides the query string parameter
//     //BY using the filter object inside the find method we filter the api
//     // const tours = await Tour.find(req.query);

//     //We can also filter the api through using some special mongoose methods
//     //here i have hardcoded the value to show these special methods
//     // const tours = await Tour.find()
//     //   .where('duration')
//     //   .equals(4)
//     //   .where('difficulty')
//     //   .equals(3);

//     //But there is a problem we don't want fields such as sort,pagination,limit etc in the req.query object because these fields are not present in the database we will just use this information to implement these functionalities in the next coming lectures
//     //So we need to exclude these fields in the req.query object

//     //creating a hard copy of the object so that whatever changes we make in the queryObj will not be there in the queryObj
//     const queryObj = { ...this.queryString };
//     const excludedFields = ['sort', 'page', 'limit', 'fields'];

//     //Deleting this excluded fields from the queryObj
//     excludedFields.forEach(el => delete queryObj[el]);

//     //and also converting the js object to a string
//     let queryStr = JSON.stringify(queryObj);

//     //Advance Filtering of the api....!
//     //So here we will also add filtering for less than type operators
//     //the url will be like this localhost:8000/api/v1/tours?duration[lt]=3&difficulty=easy
//     //so express will directly provide a this in req.query as
//     // {
//     //   duration: { lt: 3 },
//     //   difficulty:"easy"
//     // }
//     //replacing gt,gte,lt,lte with $gt etc respectively from the queryObj string
//     queryStr = queryStr.replace(/\b(gt|gte|lt|lte)\b/g, match => `$${match}`);

//     //First here we will creating the query because we want to chain all methods like sort etc to this query because sort method is a method of query object
//     //find method just returns a query (A mongoose query class instance which has some special methods like sort which we can chain on it)
//     //Building the query
//     this.query = this.query.find(JSON.parse(queryStr));
//     return this;
//   }

//   //adding some more functionality to the query
//   //So for this sort functionality url will be like http://localhost:8000/api/v1/tours?duration[gt]=4&difficulty=easy&sort=price,ratingsAvg
//   //if you provide sort=-price that - in query.sort will mean that we need to sort in descending order and if minus is not present then it will sort in dscending order
//   sort() {
//     if (this.queryString.sort) {
//       const sortBy = this.queryString.sort.split(',').join(' ');
//       this.query = this.query.sort(sortBy);
//     } else {
//       this.query = this.query.sort('-createdAt');
//     }
//     return this;
//   }
//   //Limiting the fields....
//   //Why there is a need to limit the fields...?
//   //we need to limit the fileds that arrives in the document from the database because then less data will be there and it will be more efficient
//   //We limit the fields in order to get the fields  only we want not the unnecessary fields
//   //so we mention the field paramter in the query string in the  url like fields=name,price,rating
//   limitFields() {
//     if (this.queryString.fields) {
//       const fieldStr = this.queryString.fields.split(',').join(' ');
//       //making the query which will only retrieve these fields from the database
//       this.query = this.query.select(fieldStr);
//     } else {
//       //for the default case we want to exclude some fields
//       //now here whenever you create some data in the database then always mongoose create _v field which mongoose uses internally but we can exclude it from output
//       //-sign will exclude it from output
//       this.query = this.query.select('-__v');
//     }
//     return this;
//   }
//   paginate() {
//     //Implementing pagination
//     const page = this.queryString.page * 1 || 1;
//     const limit = this.queryString.limit * 1 || 100;
//     const skip = (page - 1) * limit;
//     //skip method for how many results you want to skip and limit is how many results you want to show
//     this.query = this.query.skip(skip).limit(limit);

//     return this;
//   }
// }

//Implementing aggregate pipeline
//Basically aggregate pipeling is a framework in mongodB with the help of which documents go through a certain steps and after those steps we get aggegated data
//mongoose also provides us this framework
//basically taks such as calculating maxprice,average etc these all things can be easily done through aggregate pipelining

exports.getTourStats = catchAsync(async function(req, res, next) {
  //we have the aggregate function on the mongoose model in which we pass array of steps and each step is an object
  //Finally aggregate will return a query
  const stats = await Tour.aggregate([
    //Our first step is match which basically filter the documents based on the filter object provided
    {
      $match: { ratingsAverage: { $gte: 4.5 } }
    },
    //Next step is group stage
    //Group stage has two main uses--
    //1.used to  group the documents into different groups
    //2.to aggregate values/data from the grouped documents
    //the first field that you provide in the group stage is _id and this is compulsory
    //if i provide _id:null so only one group will be made
    //if i provide _id:"$difficulty" then three groups will be made 1st group will be having all the documents with easy,2nd group having all the documents with medium and 3rd group having alll the documents difficult
    //after providing the id field we provide some more fields according to us like totol price etc
    //and then after providing the field we provide a query like this { $sum: '$price' } so now for all the three groups separately total price will be calculated
    //GENERALLY HERE THE FIELD NAMES WHICH ARE PRESENT IN THE DATABASE ARE WRITTEN WITH $ infront
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $min: '$price' },
        numRatings: { $sum: '$ratingsQuantity' },
        totalNoOfDocuments: { $sum: 1 }
      }
    },
    // Here you can use sort stage also
    {
      $sort: {
        //here 1 means ascending order
        avgPrice: 1
      }
    },
    {
      $match: { _id: { $ne: 'EASY' } }
    }
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      stats: stats
    }
  });
});

exports.getMonthlyPlan = async function(req, res, next) {
  const { year } = req.params;
  const busiestTour = await Tour.aggregate([
    { $unwind: '$startDates' },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },

    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' }
      }
    },
    {
      $addFields: {
        month: '$_id'
      }
    },
    {
      $project: {
        _id: 0
      }
    },
    {
      $sort: { numTourStarts: -1 }
    },
    {
      $limit: 12
    }
  ]);
  res.status(200).json({
    status: 'success',
    busiestTour: busiestTour
  });
};

exports.aliasTopTours = function(req, res, next) {
  req.query.sort = '-ratingsAverage,price';
  req.query.limit = '5';
  req.query.fields = 'ratingsAverage,price,name,summary,difficulty';
  next();
};

exports.getToursWithIn = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    return next(new AppError('You need to provide latitude and longitude'));
  }

  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours
    }
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;
  if (!lat || !lng) {
    return next(new AppError('You need to provide latitude and longitude'));
  }

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1]
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier
      }
    },
    {
      $project: {
        distance: 1,
        name: 1
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances
    }
  });
});

exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, 'reviews');
exports.createNewTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);

//saving the image file in buffer initially not on the disk it is more efficient
const multerStorage = multer.memoryStorage();

//we need to only store the files having extension .jpeg
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) cb(null, true);
  else
    cb(new AppError('Only image files are allowed to be uploaded', 400), false);
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
});

exports.uploadTourImages = upload.fields([
  {
    name: 'imageCover',
    maxCount: 1
  },
  {
    name: 'images',
    maxCount: 3
  }
]);

exports.resizeTourImages = async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) {
    next();
  }

  //resize and upload the imageCover
  const imageCoverFileName = `tour=${req.params.id}-${Date.now()}-cover.jpeg`;

  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`${__dirname}/../public/img/tours/${imageCoverFileName}`);

  req.body.imageCover = imageCoverFileName;

  //resizing and uploading the images
  req.body.images = [];
  await Promise.all(
    req.files.images.map(async (file, i) => {
      const imageFileName = `tour-$req.params.id}-${Date.now()}-${i + 1}.jpeg`;
      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`${__dirname}/../public/img/tours/${imageFileName}`);

      req.body.images.push(imageFileName);
    })
  );
  next();
};
