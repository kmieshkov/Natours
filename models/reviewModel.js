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

  await Tour.findByIdAndUpdate(tourId, {
    ratingQuantity: stats[0].nRating,
    ratingsAverage: stats[0].avgRating,
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

// Middleware with post does not have 'next'
reviewSchema.post('save', function () {
  // 'this' point to current document (review)
  // constructor the model that createed the document
  this.constructor.calcAverageRatings(this.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
