const CustomOrder = require('../models/customOrderModel');
const User = require('../models/userModel');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/apiError');
const {
  validateCustomOrderFields,
  validateCustomPricing,
  validateStatusTransition,
  validateAdminNotes,
  validateCustomerResponse,
  getPricingTierInfo,
} = require('../utils/customOrderValidation');
const {
  setCustomOrderDefaults,
  getCustomOrderPopulationOptions,
  formatCustomOrderResponse,
  buildCustomOrderUpdateObject,
  generateQuoteEmailContent,
  calculateCustomOrderDelivery,
  getStatusDisplayInfo,
} = require('../utils/customOrderUtils');

// Get all custom orders (admin only)
exports.getAllCustomOrders = factory.getAll(CustomOrder);

// Get single custom order
exports.getOneCustomOrder = factory.getOne(CustomOrder);

// Create new custom order request
exports.createCustomOrder = factory.createOne(CustomOrder);

// Update custom order (for customers - limited fields)
exports.updateCustomOrder = factory.updateOne(CustomOrder);

// Admin: Update custom order status
exports.updateCustomOrderStatus = catchAsync(async (req, res, next) => {
  const { status, adminNotes } = req.body;

  if (!status) {
    return next(new AppError('Please provide a status', 400));
  }

  // Get current order
  const existingOrder = await CustomOrder.findById(req.params.id);
  if (!existingOrder) {
    return next(new AppError('No custom order found with that ID', 404));
  }

  // Validate status transition
  const statusError = validateStatusTransition(existingOrder.status, status);
  if (statusError) {
    return next(new AppError(statusError, 400));
  }

  // Validate admin notes if provided
  if (adminNotes) {
    const notesError = validateAdminNotes(adminNotes);
    if (notesError) {
      return next(new AppError(notesError, 400));
    }
  }

  // Update status using the model method
  existingOrder.updateStatus(status, req.user._id);
  if (adminNotes) existingOrder.adminNotes = adminNotes;

  await existingOrder.save();

  // Populate the updated order
  await existingOrder.populate(getCustomOrderPopulationOptions());

  // Format response message based on status
  let message = 'Custom order status updated successfully';
  switch (status) {
    case 'reviewing':
      message = 'Custom order is now under review';
      break;
    case 'quoted':
      message = 'Quote has been provided for the custom order';
      break;
    case 'approved':
      message = 'Custom order has been approved and is ready for production';
      break;
    case 'in_production':
      message = 'Custom order is now in production';
      break;
    case 'completed':
      message = 'Custom order has been completed successfully';
      break;
    case 'cancelled':
      message = 'Custom order has been cancelled';
      break;
  }

  const response = formatCustomOrderResponse(existingOrder, message);
  res.status(200).json(response);
});

// Admin: Set custom pricing for custom order (10-49 and 100+ tiers)
exports.setCustomOrderPricing = catchAsync(async (req, res, next) => {
  const { pricePerCard } = req.body;

  // Get current order
  const existingOrder = await CustomOrder.findById(req.params.id);
  if (!existingOrder) {
    return next(new AppError('No custom order found with that ID', 404));
  }

  // Check if this quantity tier allows custom pricing
  const quantity = existingOrder.orderDetails.employeeCount;
  if (quantity >= 50 && quantity <= 99) {
    return next(
      new AppError(
        'This quantity tier uses fixed package pricing, not custom pricing',
        400
      )
    );
  }

  // Validate custom pricing
  const pricingError = validateCustomPricing(
    { pricePerCard },
    existingOrder.orderDetails.employeeCount
  );
  if (pricingError) {
    return next(new AppError(pricingError, 400));
  }

  // Set custom pricing using the model method
  existingOrder.setCustomPricing(pricePerCard);

  // Update status to quoted if still reviewing
  if (existingOrder.status === 'reviewing') {
    existingOrder.updateStatus('quoted', req.user._id);
  }

  await existingOrder.save();

  // Populate the updated order
  await existingOrder.populate(getCustomOrderPopulationOptions());

  const response = formatCustomOrderResponse(
    existingOrder,
    'Custom pricing has been set and quote is ready for customer review'
  );
  res.status(200).json(response);
});

// Admin: Assign package to custom order (50-99 tier)
exports.assignPackageToOrder = catchAsync(async (req, res, next) => {
  const { packageId } = req.body;

  if (!packageId) {
    return next(new AppError('Package ID is required', 400));
  }

  // Get current order
  const existingOrder = await CustomOrder.findById(req.params.id);
  if (!existingOrder) {
    return next(new AppError('No custom order found with that ID', 404));
  }

  // Check if package exists
  const Package = require('../models/packageModel');
  const selectedPackage = await Package.findById(packageId);
  if (!selectedPackage || !selectedPackage.isActive) {
    return next(new AppError('Package not found or inactive', 404));
  }

  // Verify quantity fits package range
  const quantity = existingOrder.orderDetails.employeeCount;
  if (
    quantity < selectedPackage.quantityRange.min ||
    quantity > selectedPackage.quantityRange.max
  ) {
    return next(
      new AppError('Order quantity does not fit this package range', 400)
    );
  }

  // Assign package using the model method
  existingOrder.assignPackage(packageId);

  // Update status to quoted if still reviewing
  if (existingOrder.status === 'reviewing') {
    existingOrder.updateStatus('quoted', req.user._id);
  }

  await existingOrder.save();

  // Populate the updated order
  await existingOrder.populate([
    ...getCustomOrderPopulationOptions(),
    { path: 'selectedPackage' },
  ]);

  const response = formatCustomOrderResponse(
    existingOrder,
    'Package has been assigned and quote is ready for customer review'
  );
  res.status(200).json(response);
});

// Customer: Respond to quote
exports.respondToQuote = catchAsync(async (req, res, next) => {
  const { approved, customerNotes } = req.body;

  if (approved === undefined) {
    return next(new AppError('Please specify if you approve the quote', 400));
  }

  // Get current order
  const existingOrder = await CustomOrder.findById(req.params.id);
  if (!existingOrder) {
    return next(new AppError('No custom order found with that ID', 404));
  }

  // Check if user owns this order
  if (existingOrder.createdBy.toString() !== req.user._id.toString()) {
    return next(
      new AppError('You can only respond to your own custom orders', 403)
    );
  }

  // Check if order is in quoted status
  if (existingOrder.status !== 'quoted') {
    return next(
      new AppError('You can only respond to quoted custom orders', 400)
    );
  }

  // Validate customer response
  const responseError = validateCustomerResponse({ customerNotes });
  if (responseError) {
    return next(new AppError(responseError, 400));
  }

  // Update customer response
  existingOrder.customerResponse = {
    approved,
    responseDate: new Date(),
    customerNotes: customerNotes || '',
  };

  // Update status if approved
  if (approved) {
    existingOrder.updateStatus('approved');
  }

  await existingOrder.save();

  // Populate the updated order
  await existingOrder.populate(getCustomOrderPopulationOptions());

  const message = approved
    ? 'Quote approved successfully! Your order will proceed to production.'
    : 'Quote response recorded. Our team will contact you soon.';

  const response = formatCustomOrderResponse(existingOrder, message);
  res.status(200).json(response);
});

// Get pricing tier information based on quantity
exports.getPricingTierInfo = catchAsync(async (req, res, next) => {
  const { quantity } = req.query;

  if (!quantity || isNaN(quantity) || quantity < 10) {
    return next(
      new AppError('Please provide a valid quantity (minimum 10)', 400)
    );
  }

  const tierInfo = getPricingTierInfo(parseInt(quantity));

  if (!tierInfo) {
    return next(new AppError('Invalid quantity range', 400));
  }

  res.status(200).json({
    status: 'success',
    data: {
      quantity: parseInt(quantity),
      tierInfo,
      note: 'This is the pricing tier for your quantity. Contact us for detailed quotes.',
    },
  });
});

// Get custom order statistics (admin only)
exports.getCustomOrderStats = catchAsync(async (req, res, next) => {
  const stats = await CustomOrder.getCustomOrderStats();

  // Additional statistics
  const totalOrders = await CustomOrder.countDocuments();
  const pendingOrders = await CustomOrder.countDocuments({ status: 'pending' });
  const quotedOrders = await CustomOrder.countDocuments({ status: 'quoted' });
  const completedOrders = await CustomOrder.countDocuments({
    status: 'completed',
  });

  // Recent orders (last 7 days)
  const recentOrders = await CustomOrder.countDocuments({
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
  });

  // Total potential revenue from quoted orders
  const quotedRevenue = await CustomOrder.aggregate([
    { $match: { status: 'quoted' } },
    { $group: { _id: null, total: { $sum: '$customPricing.totalPrice' } } },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      statusBreakdown: stats,
      overview: {
        totalOrders,
        pendingOrders,
        quotedOrders,
        completedOrders,
        recentOrders,
        potentialRevenue: quotedRevenue[0]?.total || 0,
      },
    },
  });
});

// Get orders by status
exports.getCustomOrdersByStatus = catchAsync(async (req, res, next) => {
  const { status } = req.params;

  const validStatuses = [
    'pending',
    'reviewing',
    'quoted',
    'approved',
    'in_production',
    'completed',
    'cancelled',
  ];

  if (!validStatuses.includes(status)) {
    return next(new AppError('Invalid status provided', 400));
  }

  const orders = await CustomOrder.findByStatus(status);

  res.status(200).json({
    status: 'success',
    results: orders.length,
    data: {
      orders,
      statusInfo: getStatusDisplayInfo(status),
    },
  });
});

// Get my custom orders (for customers)
exports.getMyCustomOrders = catchAsync(async (req, res, next) => {
  const orders = await CustomOrder.find({ createdBy: req.user._id })
    .populate(getCustomOrderPopulationOptions())
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: orders.length,
    data: {
      orders,
    },
  });
});

// Delete custom order (admin only)
exports.deleteCustomOrder = factory.deleteOne(CustomOrder);

// Get quote email content (for testing/preview)
exports.getQuoteEmailPreview = catchAsync(async (req, res, next) => {
  const customOrder = await CustomOrder.findById(req.params.id);

  if (!customOrder) {
    return next(new AppError('No custom order found with that ID', 404));
  }

  if (!customOrder.customPricing?.totalPrice && !customOrder.selectedPackage) {
    return next(new AppError('No pricing set for this custom order', 400));
  }

  const emailContent = generateQuoteEmailContent(customOrder);

  res.status(200).json({
    status: 'success',
    data: {
      emailContent,
    },
  });
});
