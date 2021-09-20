const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: [true, 'Ratings are needed']
    },
    review: {
      type: String,
      required: [true, 'Review is Required']
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review should belong to a tour']
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review should belong to a user']
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

//populating the fields before find query gets executed
reviewSchema.pre(/^find/, function(next) {
  // this.populate('tour')
  //   .populate({
  //     path: 'tour',
  //     select: 'name'
  //   })
  this.populate({
    path: 'user',
    select: 'name photo'
  });
  next();
});

reviewSchema.statics.calAvgRatings = async function(tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId }
    },
    {
      $group: {
        _id: '$tour',
        nRatings: { $sum: 1 },
        avgRatings: { $avg: '$rating' }
      }
    }
  ]);
  await Tour.findByIdAndUpdate(tourId, {
    ratingsAverage: stats[0].avgRatings,
    ratingsQauntity: stats[0].nRatings
  });
};

//changing the average ratings and number of ratings on the tour document when a review is saved
reviewSchema.post('save', async function() {
  //this will point to new review
  await this.constructor.calAvgRatings(this.tour);
});

//changing the average ratings and number of ratings on the tour document when a review is updated or deleted
//findById and findByUpdate in the background are find One and update and findOneAndDelete
reviewSchema.pre(/^findOneAnd/, async function(next) {
  this.r = await this.findOne();
  // console.log(this.r);
  next();
});

reviewSchema.index({ user: 1, tour: 1 }, { unique: true });
//making the changes in the tour document after persisting the review in the database
reviewSchema.post(/^findOneAnd/, async function() {
  // await this.findOne(); does NOT work here, query has already executed
  await this.r.constructor.calAvgRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
