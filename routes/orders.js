const express = require('express');
const {
  getAllOrders,
  createOrder,
  getOneOrder,
  updateOrder,
  deleteOrder,
  // aliasRecentOrders,
  // aliasPendingOrders,
  // getOrderStats,
  // getOrdersByStatus,
  // getOrdersByCountry,
  // getCustomerOrders,
  // getMyOrders,
  // getOrdersCreatedByMe,
  // updateOrderStatus,
  // trackOrder,
  // getOrdersDashboard,
} = require('../controllers/orders.controllers');
const { protect, restrictTo } = require('../controllers/authConroller');
const { orderFiles } = require('../utils/fileUpload');
const multer = require('multer');
const { parseFormData } = require('../utils/orderValidation');
const { processOrderFiles } = require('../utils/orderUtils');

const router = express.Router();

// Configure multer for NFC card order files

// Public routes (no authentication required)
// router.route('/track/:orderId').get(trackOrder);
// router.route('/recent').get(aliasRecentOrders, getAllOrders);
// router.route('/pending').get(aliasPendingOrders, getAllOrders);
// router.route('/stats').get(getOrderStats);
// router.route('/dashboard').get(getOrdersDashboard);
// router.route('/status/:status').get(getOrdersByStatus);
// router.route('/country/:country').get(getOrdersByCountry);

// Protected routes - user must be logged in
// router.use(protect);

// User-specific routes
// router.route('/my-orders').get(getMyOrders);
// router.route('/created-by-me').get(getOrdersCreatedByMe);

// Customer orders (accessible by admin or the customer themselves)
// router.route('/customer/:customerId').get(getCustomerOrders);

// Main CRUD routes with file upload support
router
  .route('/')
  .get(getAllOrders)
  .post(orderFiles, parseFormData, createOrder);

router
  .route('/:id')
  .get(getOneOrder)
  .patch(orderFiles, parseFormData, updateOrder)
  .delete(protect, restrictTo('admin', 'user'), deleteOrder);

// Order status management
// router.route('/:id/status').patch(updateOrderStatus);

module.exports = router;
