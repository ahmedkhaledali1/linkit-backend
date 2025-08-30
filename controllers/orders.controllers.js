const express = require('express');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const APIFeatures = require('../utils/apiFeatures');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/apiError');
const {
  validateCompanyLogo,
  validateDeliveryInfo,
  validateRequiredFields,
} = require('../utils/orderValidation');
const {
  calculateOrderTotal,
  processOrderFiles,
  buildOrderUpdateObject,
  setOrderDefaults,
  getOrderPopulationOptions,
  formatOrderResponse,
  processOrderAddonsFiles,
} = require('../utils/orderUtils');
const { getRelativeFilePath } = require('../utils/fileUpload');
const City = require('../models/cityModel');
const AddonModel = require('../models/AddonModel');

// Get all orders with filtering, sorting, field limiting, and pagination
exports.getAllOrders = factory.getAll(Order, [
  { path: 'product', select: 'title price cardDesigns' },
  { path: 'addons.addon' },
]);

// Create new NFC card order
exports.createOrder = catchAsync(async (req, res, next) => {
  if (
    req?.files &&
    req?.files?.addonImages &&
    req?.files?.addonImages?.length > 0
  ) {
    req.body.addonImages = req.files.addonImages.map((file) =>
      getRelativeFilePath(file)
    );
  }
  if (req?.files && req?.files?.companyLogo?.[0]) {
    req.body.cardDesign.companyLogo = getRelativeFilePath(
      req.files.companyLogo[0]
    );
  }

  // console.log('req.files', req.files);
  if (req?.files && req?.files?.despositeTransactionImg?.[0]) {
    req.body.despositeTransactionImg = getRelativeFilePath(
      req.files.despositeTransactionImg[0]
    );
  }

  req?.body?.addons.map((addon) => {
    if (addon?.inputType === 'image') {
      addon.addonValue = getRelativeFilePath(req.files.addonImages[0]);
    }
  });
  // console.log('req.body,,, before deleviry validation', req.body);
  // Validate required fields
  const requiredFieldsError = validateRequiredFields(req.body);
  if (requiredFieldsError) {
    return next(new AppError(requiredFieldsError, 400));
  }

  // Get product details and validate
  const product = await Product.findById(req.body.product);
  if (!product) {
    return next(new AppError('Product not found', 404));
  }

  // Process file uploads
  // processOrderFiles(req.files.companyLogo, req.body);

  const city = await City.findById(req.body?.deliveryInfo?.city);

  if (!city) {
    return next(new AppError('City is not exist '));
  }
  // console.log('city...', city?.deliveryFee);
  // Calculate pricing
  const addons = await Promise.all(
    req?.body?.addons?.map(async (addon) => {
      const addonDetails = await AddonModel.findById(addon.addon);
      return addonDetails;
    })
  );
  // console.log('addons...', addons);
  const { total, logoSurcharge, finalTotal } = calculateOrderTotal(
    product.price,
    req.body.cardDesign?.includePrintedLogo,
    0,
    city?.deliveryFee,
    addons
  );
  req.body.productPrice = product.price;
  req.body.total = total;
  req.body.logoSurcharge = logoSurcharge;
  req.body.finalTotal = finalTotal;

  // console.log('req.body.cardDesign', req.body.cardDesign);
  // Validate company logo
  const logoError = validateCompanyLogo(req.body.cardDesign, req.file);
  if (logoError) {
    return next(new AppError(logoError, 400));
  }

  // Create the order
  const newOrder = await Order.create(req.body);

  // console.log('newOrder', newOrder);
  // console.log('req.deliveryError', deliveryError);
  // Populate the created order
  const respon = await newOrder.populate(getOrderPopulationOptions());
  // console.log('respon', respon);
  // Format and send response
  const response = formatOrderResponse(
    newOrder,
    `NFC Card order ${newOrder._id} created successfully!  `
  );

  res.status(201).json(response);
});

// Update order
exports.updateOrder = catchAsync(async (req, res, next) => {
  // Get current order for validation
  const existingOrder = await Order.findById(req.params.id);
  if (!existingOrder) {
    return next(new AppError('No order found with that ID', 404));
  }

  if (req.files && req.files.addonImages && req.files.addonImages.length > 0) {
    req.body.addonImages = req.files.addonImages.map((file) =>
      getRelativeFilePath(file)
    );
  }
  if (req.files && req.files.companyLogo[0]) {
    req.body.cardDesign.companyLogo = getRelativeFilePath(
      req.files.companyLogo[0]
    );
  }
  // console.log('req.files', req.files);
  if (req.files && req.files.despositeTransactionImg[0]) {
    req.body.despositeTransactionImg = getRelativeFilePath(
      req.files.despositeTransactionImg[0]
    );
  }

  // Validate company logo
  const logoError = validateCompanyLogo(
    req.body.cardDesign,
    req.files.companyLogo[0],
    existingOrder
  );
  if (logoError) {
    return next(new AppError(logoError, 400));
  }

  // Validate delivery info

  // Build update object
  const updateData = buildOrderUpdateObject(req.body);

  // Add uploaded file paths to update data

  // Check if there's actually something to update
  if (Object.keys(updateData).length === 0) {
    return next(new AppError('No valid fields provided for update', 400));
  }

  // Update the order
  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { $set: updateData },
    {
      new: true,
      runValidators: false,
    }
  );

  console.log('order..', order);

  // Populate the updated order
  await order.populate(getOrderPopulationOptions());

  // Format and send response
  const response = formatOrderResponse(order, 'Order updated successfully');
  res.status(200).json(response);
});

// Update order status with automatic date tracking
exports.updateOrderStatus = catchAsync(async (req, res, next) => {
  const { status, notes } = req.body;

  if (!status) {
    return next(new AppError('Please provide a status', 400));
  }

  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new AppError('No order found with that ID', 404));
  }

  try {
    order.updateStatus(status);

    // Add notes if provided
    if (notes) {
      order.notes = notes;
    }

    await order.save();

    await order.populate([
      { path: 'customer', select: 'name email' },
      { path: 'product', select: 'title price images colors' },
      { path: 'createdBy', select: 'name email' },
    ]);

    // Send different messages based on status
    let message = `Order status updated to ${status}`;
    if (status === 'confirmed') {
      message = 'Order confirmed! Your NFC card will be printed soon.';
    } else if (status === 'printed') {
      message = 'Your NFC card has been printed and is ready for shipping!';
    } else if (status === 'shipped') {
      message = 'Your NFC card has been shipped! You will receive it soon.';
    } else if (status === 'delivered') {
      message = 'Order delivered successfully! Thank you for your business.';
    }

    res.status(200).json({
      status: 'success',
      data: {
        order,
        summary: order.getOrderSummary(),
      },
      message,
    });
  } catch (error) {
    return next(new AppError(error.message, 400));
  }
});

// Delete order
exports.deleteOrder = factory.deleteOne(Order);

// Get single order with populated data
exports.getOneOrder = factory.getOne(Order, getOrderPopulationOptions());

// Get customer orders (with role-based access control)
exports.getCustomerOrders = catchAsync(async (req, res, next) => {
  const { customerId } = req.params;

  // Check if user is admin or requesting their own orders
  if (req.user.role !== 'admin' && req.user._id.toString() !== customerId) {
    return next(new AppError('You can only access your own orders', 403));
  }

  const orders = await Order.findByCustomer(customerId);

  res.status(200).json({
    status: 'success',
    results: orders.length,
    data: {
      orders,
    },
  });
});

// Get my orders (orders for the logged-in user)
exports.getMyOrders = catchAsync(async (req, res) => {
  const features = new APIFeatures(
    Order.find({ customer: req.user._id }),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const orders = await features.query
    .populate('customer', 'name email')
    .populate('product', 'title price');

  res.status(200).json({
    status: 'success',
    results: orders.length,
    data: {
      orders,
    },
  });
});
