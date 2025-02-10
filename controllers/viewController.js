const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');

exports.getOverview = catchAsync(async (req, res, next) => {
  // 1. Get tour data from collection
  const tours = await Tour.find();

  // 2. Build template - done in /views/overview.pug
  // 3. Render template using data from step #1

  res.status(200).render('overview', {
    title: 'All tours',
    tours,
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  // 1. Get data for the requested tour (including reviews and guides)
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fileds: 'review rating user',
  });

  // 2. Build template - done it /views/tour.pug
  // 3. Render template using data from step #1

  res.status(200).render('tour', {
    title: tour.name,
    tour,
  });
});
