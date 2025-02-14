const multer = require('multer');
const sharp = require('sharp');
const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('../utils/appError');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) {
    return next();
  }

  const imageCoverFilename = `tour-${req.params.id}-${Date.now()}-cover.jpg`;

  // 1. Cover image
  sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${imageCoverFilename}`);
  req.body.imageCover = imageCoverFilename;

  // 2. Tour images
  req.body.images = [];

  await Promise.all(
    req.files.images.map(async (file, index) => {
      const currentFileName = `tour-${req.params.id}-${Date.now()}-${index + 1}.jpg`;

      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${currentFileName}`);
      req.body.images.push(currentFileName);
    }),
  );

  next();
});

exports.checkBody = (req, res, next) => {
  // Middleware for specific route
  console.log('Middleware for POST tour route 🕵️');
  next();
};

exports.aliasTopTours = (req, res, next) => {
  req.query = {
    limit: 5,
    sort: 'price,-ratingsAverage',
  };
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.deleteAllTours = catchAsync(async (req, res, next) => {
  await Tour.deleteMany();

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        numOfTours: { $sum: 1 },
        numOfRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: { avgPrice: 1 },
    },
    // Stages can be repeated, for ref:
    // {
    //   $match: { _id: { $ne: 'EASY' } },
    // },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

// Bussiness issue: see the load for every month, and identify busiest month of th specified year
exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;
  const plan = await Tour.aggregate([
    // Split tours for each of startDates
    {
      $unwind: '$startDates',
    },
    // Filter tours for specified year
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    // Group by start day, adding tours qty and keeping the name
    {
      $group: {
        _id: { $month: '$startDates' }, // Id reflects the month
        numTourStart: { $sum: 1 },
        tours: { $push: '$name' },
      },
    },
    // Add separate field for months
    {
      $addFields: { month: '$_id' },
    },
    // Remove id
    {
      $project: {
        _id: 0,
      },
    },
    // Sort by month, starting from the busiest one
    {
      $sort: { numTourStart: -1 },
    },
    // Linit output
    {
      $limit: 12,
    },
    // Map month number to month name
    {
      $addFields: {
        month: {
          $arrayElemAt: [
            [, 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            '$month',
          ],
        },
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});

// /tours-within/30/center/-40,45/mi
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [latitude, longitude] = latlng.split(',');

  // Radiants = distance / Earth's radius (in miles or km based on unit)
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!latitude || !longitude) {
    next(new AppError('Please provide latitude and longitude in the format lat,lng', 400));
  }

  const tours = await Tour.find({
    startLocation: {
      $geoWithin: { $centerSphere: [[longitude, latitude], radius] },
    },
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [latitude, longitude] = latlng.split(',');

  if (!latitude || !longitude) {
    next(new AppError('Please provide latitude and longitude in the format lat,lng', 400));
  }

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        // Point from which distances is calculated, specified in GeoJSON
        near: {
          type: 'Point',
          coordinates: [longitude * 1, latitude * 1], // Convert to numbers
        },
        distanceField: 'distance',
        distanceMultiplier: unit === 'mi' ? 0.000621371 : 0.001,
      },
    },
    // Project stage
    {
      // List of fields to keep
      $project: {
        distance: {
          $round: ['$distance', 2], // Round to 2 decimal numbers
        },
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances,
    },
  });
});

exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);
