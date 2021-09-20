const mongoose = require('mongoose');
const slugify = require('slugify');
// const User = require('./userModel');
// const slugify = require('slugify');
//A schema provides the information about the data types,validations and much more things
const tourSchema = new mongoose.Schema(
  {
    //If you just want to mention that the document should have a field name which should be a string then we just write the below line
    // name:String,
    //But if you want to provide some more options then the field should be a given a object options
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      //this trim will remove all the white spaces at the begining and end.
      trim: true,
      minLength: [10, 'Name should have atleast 10 characters'],
      maxLength: [40, 'Name should have less than fourty characters']
    },
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration']
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size']
    },
    difficulty: {
      type: String,
      //These are mongoose inbuilt validators
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either:medium,easy or difficult'
      }
    },
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      }
    ],
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: 1,
      max: 5,
      set: val => Math.round(val * 10) / 10
    },
    ratingsQuantity: {
      type: Number,
      default: 0
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a pric']
    },

    //building a custom validator to check whether discount price is less or equal to price
    //basically validator is a function that returns true or false
    //You can also use a npm library called validator which provides many validator functions
    priceDiscount: {
      type: Number,
      validate: {
        //val basically represents the input value ---priceDiscount .
        validator: function(val) {
          //this represents the document
          return val <= this.price;
        },
        //here you can also get access to value use this syntax because it is not js it is intenral mongoose
        message: 'Discount price should be less than ({VALUE})'
      }
    },

    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a summary']
      //If you add a property here select:false then when we will read data from database then this field will not be present in the output
      // select:false
    },
    description: {
      type: String,
      trim: true
    },
    imageCover: {
      //here basically we will provide the name of the image file that is present in the file system
      //Generally this is a common practice and we don't store images in the database we generally store them in file and just store the name of the file in the database
      type: String,
      required: [true, 'A tour must have a cover image']
    },
    secretTour: {
      type: Boolean,
      default: false
    },
    slug: String,
    //array of images
    images: [String],
    createdAt: {
      //Date is also a inbuilt javascript data type used to store data type values
      type: Date,
      //Now here date.now will provide time in milliseconds which mongo will automatically convert to today's date
      default: Date.now()
    },
    startDates: [Date],
    startLocation: {
      type: {
        type: String,
        default: 'Point',
        enum: ['Point']
      },
      coordinates: [Number],
      address: String,
      description: String
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number
      }
    ]
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

//Virtual Properties---
//Virtual fields are the fields that you don't want to save in the database
//But when you retrieve that document from the database from the database then you want that field to show
//The function present inside the get method will be called everytime when you retrieve that a document from the database
//so here in this application we have the duration in days and now we want to create a durationWeeks fields which stores data in weeks so we don't want to save this field in the database because there is no sense to save this in the database we can directly calculate it from duratio in days
//So whenever we will get a document from the database then a durationWeeks will be created which will be given the value returned by the callback function provided in the get method
tourSchema.virtual('durationWeeks').get(function() {
  return this.duration / 7;
});

//MongoDb Indexing inorder to make our code efficient.....!
tourSchema.index({ price: 1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

//virtual populate for reviews
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id'
});

//Mongoose MiddleWares....!
//Mongoose has two types of middleware functions
//pre and post
//pre functions runs before actually things happen in the databases like saving etc
//post functions run after the things happen in the database like after saving the data in the database
//Mongoose has four types of middlewares

//1.Document MiddleWare:
//document middlewares run on events like saving in the database,create query execution in the database
// A)In preForm---
// // this in the function refers to the document before saving it in the database
// tourSchema.pre('save', function(next) {
//   //this slug field will not be saved in the database because this field is not includes in the schema so we need to create this field in the database
//   this.slug = slugify(this.name, { lower: true });
//   //for calling the next middleware
//   next();
// });
// // //B)Post form
// // //here in the callback function we have access to docs which is the document that has been saved in the database
// tourSchema.post('save', function(docs, next) {
//   console.log(docs);
//   next();
// });

//2.Query MiddleWare
//A)Pre form
//this middleware will run before a query executes
tourSchema.pre(/^find/, function(next) {
  //here this represents this
  this.find({ secretTour: { $ne: true } });
  //creating a property on this query
  this.startTime = Date.now();
  next();
});

tourSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordCreatedAt'
  });
  next();
});

tourSchema.pre('save', function(next) {
  this.slug = slugify(this.name.toLowerCase());
  next();
});

//In post form....
//here also this represents the query
//after the query gets executed this function will run
tourSchema.post(/^find/, function(docs, next) {
  console.log(`Query took ${Date.now() - this.startTime} milliseconds`);
  console.log(docs);
  next();
});

//Aggregation middleware
//A)Preform
//this will run before aggregation
// tourSchema.pre('aggregate', function(next) {
//   //this represents the aggregate object/query
//   //calling pipeline() will return the array that you pass at the time of aggregation pipeline which consists of stages
//   //unshift basically adds a property at the starting of the array
//   console.log(this.pipeline());
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   console.log(this.pipeline());
//   next();
// });

//before saving embedding the tour guides into the tours collection
// tourSchema.pre('save', async function(next) {
//   const guidePromises = this.guides.map(async id => await User.findById(id));
//   this.guides = await Promise.all(guidePromises);
//   next();
// });

//So basically model is like a blueprint for creating documents
//So mongoose.model accepts two parameters first one is the name of the model/collection(which should be in capital) and second is schema
//Inside the database this collection named we pass will be saved as tours
const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
