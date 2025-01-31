const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');
const User = require('./userModel');

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
    startLocation: {
      // GeoJSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      // longitude, latitude
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    // Establish reference between different datasets (guides aka Users, and tours) in Mongoose
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User', // ref to user model
      },
    ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// A virtual property in Mongoose is a dynamically computed field
// that is not stored in the database and cannot be used for filtering or querying
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration ? this.duration / 7 : undefined;
});

// Virtual rpopulate with eferrencing to Reviews model
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour', // name of the filed in the Review model, where ref for this model stored
  localField: '_id', // connection to the field in current model, that is named 'tour' in the other model
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

// // Implements embedding 'guides' into the 'tour' document ONLY on 'save'
// // Guides in the Schema should be type: Array
// tourSchema.pre('save', async function (next) {
//   // Array of promises, as findById returns a promise for each guide ID
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id));

//   // Resolve all promises once they are fulfilled and update the guides field
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

/********* Query middleware *********/

// 'this' keyword points to current query
// because we're not processing documents, we're processing query
// regex applies to all queries except ones that include delete
tourSchema.pre(/^find/, function (next) {
  this.start = Date.now();
  next();
});

tourSchema.post(/^find/, function (docs, next) {
  console.log(`Query took ${Date.now() - this.start} ms`);
  next();
});

tourSchema.pre(/^find/, function (next) {
  // If make 'guides to populate ONLY if it's specifically mentioned in a query
  // OR by default when there is no query on what fields to include
  if (!this._fields || 'guides' in this._fields) {
    // Populate 'guides' field with user data based on ObjectId,
    // affecting ONLY the query result, NOT the database.
    // Populate creates a separate query to DB, which may affects performance
    this.populate({
      path: 'guides', // filed that needs to be populated
      select: '-__v -passwordChangedAt', // fields that need to be removed from output
    });
    // .populate('guides') - simplier solution if only one field need to be populated
  }

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
