const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review cannot be empty'],
    },
    rating: {
      type: Number,
      required: [true, 'A review must have a rating'],
      min: [1, 'A rating must be above 1.0'],
      max: [5, 'A rating must be below 5.0'],
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user'],
    },
  },
  {
    toJsom: { virtuals: true },
    toObject: { virtuals: true },
  },
);

/********* Static methods *********/

reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      // Without grouping, the result would be an array of individual reviews for the tour
      $group: {
        // Grouping all tours together
        // Since all ratings belong to the same tour, using null instead of tour works the same
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  console.log(stats);

  // Updfate ratings only when they're exist in DB, otherwise fallback for default Schema values
  const ratingsQuantity = stats[0]?.nRating || Tour.schema.path('ratingsQuantity').options.default;
  const ratingsAverage = stats[0]?.avgRating || Tour.schema.path('ratingsAverage').options.default;

  await Tour.findByIdAndUpdate(tourId, {
    ratingsQuantity,
    ratingsAverage,
  });
};

/********* Query middleware *********/

reviewSchema.pre(/^find/, function (next) {
  // // Populate tour and user
  // // Each 'populate' adds a query to DB
  // this.populate({
  //   path: 'tour',
  //   select: 'name',
  // }).populate({
  //   path: 'user',
  //   select: 'name photo',
  // });

  // Populate only user as it is included in Tour model
  // Tour should be excluded to prevent nesting
  this.populate({
    path: 'user',
    select: 'name photo',
  });

  next();
});

// Calculate average rating
// Middleware with post does not have 'next'
reviewSchema.post('save', async (doc) => {
  // 'this' point to current document (review)
  // constructor the model that createed the document
  await doc.constructor.calcAverageRatings(doc.tour);
});

// Pre-middleware: Stores the current review document in tmpReview before executing findOne queries
// Necessary for findByIdAndUpdate and findByIdAndDelete, but internally they use findOne
reviewSchema.pre(/^findOneAnd/, async function (next) {
  this.tmpReview = await this.findOne(this.tour);
  next();
});

// Post-middleware: After the query executes, updates avg ratings using the stored tmpReview data
// Ratings are recalculated when a review is modified with fresh data
reviewSchema.post(/^findOneAnd/, async function () {
  if (this.tmpReview) {
    await this.tmpReview.constructor.calcAverageRatings(this.tmpReview.tour);
    delete this.tmpReview;
  }
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
