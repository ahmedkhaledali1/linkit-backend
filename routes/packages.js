const express = require('express');
const {
  getAllPackages,
  createPackage,
  getOnePackage,
  updatePackage,
  deletePackage,
  getActivePackages,
  getPackagesByType,
  findPackageByQuantity,
  getPricingInfo,
  seedPackages,
} = require('../controllers/packages.controllers');
const { protect, restrictTo } = require('../controllers/authConroller');

const router = express.Router();

// Public routes
router.route('/active').get(getActivePackages);
router.route('/type/:type').get(getPackagesByType);
router.route('/find-by-quantity').get(findPackageByQuantity);
router.route('/pricing-info').get(getPricingInfo);

// Protected routes (authentication required)
router.use(protect);

// Development route for seeding initial packages
router.route('/seed').post(restrictTo('admin'), seedPackages);

// Admin routes
router
  .route('/')
  .get(restrictTo('admin'), getAllPackages)
  .post(restrictTo('admin'), createPackage);

router
  .route('/:id')
  .get(restrictTo('admin'), getOnePackage)
  .patch(restrictTo('admin'), updatePackage)
  .delete(restrictTo('admin'), deletePackage);

module.exports = router;
