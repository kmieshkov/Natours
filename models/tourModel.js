const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      maxlength: [40, 'A tour name must have less or equal of 40 characters'],
      minlength: [10, 'A tour name must have more than 10 characters'],
      // validate: [validator.isAlpha, 'Tour name must only contain characters'],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty must be either easy, medium, or difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'A rating must be above 1.0'],
      max: [5, 'A rating must be below 5.0'],
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        // Custom validation
        validator: function (val) {
          // 'this' keyword work only on creating a NEW document
          // function WILL NOT work on update
          return val < this.price;
        },
        message: 'Price discount ({VALUE}) must be below regular price',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a summary'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// A virtual property in Mongoose is a dynamically computed field
// that is not stored in the database and cannot be used for filtering or querying
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

/********* Document middleware *********/

// Runs before .save() and .create(),
// but does not work with insertMany() or findOneAndUpdate().
// 'this' keyword points to the current document
tourSchema.pre('save', function (next) {
  console.log('Will create slug...');
  this.slug = slugify(this.name, { lower: true });
  next();
});

tourSchema.post('save', (doc, next) => {
  console.log('After save document middleware...');
  next();
});

/********* Query middleware *********/

// 'this' keyword points to current query
// because we're not processing documents, we're processing query
// regex applies to all queries except ones that include delete
tourSchema.pre(/^find(?!.*[dD]elete)/, function (next) {
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});

tourSchema.post(/^find/, function (docs, next) {
  console.log(`Query took ${Date.now() - this.start} ms`);
  next();
});

/********* Aggregation middleware *********/

// 'this' keyword points to current aggregation object
tourSchema.pre('aggregate', function (next) {
  this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
  console.log(this.pipeline());
  next();
});

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
