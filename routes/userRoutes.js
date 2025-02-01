const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/signin', authController.signin);

router.post('/forgot-password', authController.forgotPassword);
router.patch('/reset-password/:token', authController.resetPassword);

router.patch('/update-my-password', authController.protect, authController.updatePassword);

router.patch('/update-me', authController.protect, userController.updateMe);
router.delete('/delete-me', authController.protect, userController.deleteMe);

router.route('/').get(userController.getAllUsers);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(authController.protect, authController.restrictTo('admin'), userController.updateUser)
  .delete(authController.protect, authController.restrictTo('admin'), userController.deleteUser);

module.exports = router;
