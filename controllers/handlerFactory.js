const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const APIFeatures = require('../utils/apiFeatures');

// Generic factory function for handling CRUD operations across different controllers
// Reduces code duplication by providing a reusable template for deleting documents
// Takes Model as param and returns handle 'catchAsync' function

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const document = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        data: document,
      },
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    // To allow for nested GET reviews on tour (hack)
    const filter = {};
    if (req.params.tourId) {
      filter.tour = req.params.tourId;
    }

    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    const document = await features.query;

    // Send response
    res.json({
      status: 'success',
      results: document.length,
      data: {
        data: document,
      },
    });
  });

exports.getOne = (Model, populateOptions) =>
  catchAsync(async (req, res, next) => {
    // Save query into variable
    let query = Model.findById(req.params.id);

    // Add populate
    if (populateOptions) {
      query = query.populate(populateOptions);
    }

    // Await for query result
    const document = await query;

    if (!document) {
      return next(new AppError(`No document found with ID ${req.params.id}`, 404));
    }

    res.json({
      status: 'success',
      data: {
        data: document,
      },
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const document = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!document) {
      return next(new AppError(`No document found with ID ${req.params.id}`, 404));
    }

    res.json({
      status: 'success',
      data: {
        data: document,
      },
    });
  });

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const document = await Model.findByIdAndDelete(req.params.id);

    if (!document) {
      return next(new AppError(`No document found with ID ${req.params.id}`, 404));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  });
