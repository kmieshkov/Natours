const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

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
