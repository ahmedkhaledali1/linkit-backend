const express = require('express');
const {
  getAllCustomOrders,
  createCustomOrder,
  getOneCustomOrder,
  updateCustomOrder,
  deleteCustomOrder,
  updateCustomOrderStatus,
  setCustomOrderPricing,
  assignPackageToOrder,
  respondToQuote,
  getPricingTierInfo,
  getCustomOrderStats,
  getCustomOrdersByStatus,
  getMyCustomOrders,
  getQuoteEmailPreview,
} = require('../controllers/customOrders.controllers');
const { protect, restrictTo } = require('../controllers/authConroller');

const router = express.Router();

// Public routes
router.route('/pricing-tier').get(getPricingTierInfo);

// Protected routes (authentication required)
// router.use(protect);

// Customer routes
router.route('/my-orders').get(getMyCustomOrders);
router.route('/:id/respond').patch(respondToQuote);

// Admin routes
router.route('/stats').get(restrictTo('admin'), getCustomOrderStats);
router
  .route('/status/:status')
  .get(restrictTo('admin'), getCustomOrdersByStatus);
router.route('/:id/status').patch(restrictTo('admin'), updateCustomOrderStatus);
router.route('/:id/pricing').patch(restrictTo('admin'), setCustomOrderPricing);
router.route('/:id/package').patch(restrictTo('admin'), assignPackageToOrder);
router
  .route('/:id/email-preview')
  .get(restrictTo('admin'), getQuoteEmailPreview);

// Main CRUD routes
router
  .route('/')
  .get(protect, restrictTo('admin'), getAllCustomOrders)
  .post(createCustomOrder);

router
  .route('/:id')
  .get(getOneCustomOrder)
  .patch(updateCustomOrder)
  .delete(protect, restrictTo('admin'), deleteCustomOrder);

module.exports = router;
