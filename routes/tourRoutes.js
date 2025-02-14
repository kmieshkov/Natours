const express = require('express');
const tourController = require('../controllers/tourController');
const authController = require('../controllers/authController');
const reviewRouter = require('./reviewRoutes');

const router = express.Router();

router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan,
  );
router.route('/tour-stats').get(tourController.getTourStats);
router.route('/top-5-cheap').get(tourController.aliasTopTours, tourController.getAllTours);

router
  .route('/')
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    tourController.checkBody, // Middleware for specific route
    authController.restrictTo('lead-guide', 'admin'),
    tourController.createTour,
  )
  .delete(
    authController.protect,
    authController.restrictTo('lead-guide', 'admin'),
    tourController.deleteAllTours,
  );

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('lead-guide', 'admin'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour,
  )
  .delete(
    authController.protect,
    authController.restrictTo('lead-guide', 'admin'),
    tourController.deleteTour,
  );

// Nested routes
// POST /tours/<tour-id>/reviews - add review for a certain tour
// GET /tours/<tour-id>/reviews - get all reviews for a tour
// GET /tours/<tour-id>/reviews/<review-id> - get a reviews for a certain tour

// Mountreview routes on this scpecific route
router.use('/:tourId/reviews', reviewRouter);

// Finding tours withing specific radius from specific place
// /tours-within/30/center/-40.45/mi
router.route('/tours-within/:distance/center/:latlng/:unit').get(tourController.getToursWithin);

router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);

module.exports = router;
