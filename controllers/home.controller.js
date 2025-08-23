const Product = require('../models/productModel');
const Order = require('../models/orderModel');
const Testimonial = require('../models/testimonialModel');
const Contact = require('../models/contactModel');
const Subscriber = require('../models/subscriberModel');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/apiError');

/**
 * Get dashboard statistics
 * Returns counts of products, orders, testimonials, and contact messages
 */
const getStatistics = catchAsync(async (req, res, next) => {
  try {
    // Get counts for all collections (excluding soft-deleted documents)
    const [
      productsCount,
      ordersCount,
      testimonialsCount,
      messagesCount,
      subscribersCount,
    ] = await Promise.all([
      Product.countDocuments({ isDeleted: { $ne: true } }),
      Order.countDocuments({ isDeleted: { $ne: true } }),
      Testimonial.countDocuments({ isDeleted: { $ne: true } }),
      Contact.countDocuments({ isDeleted: { $ne: true } }),
      Subscriber.countDocuments({ isDeleted: { $ne: true } }),
    ]);

    // Get additional statistics for orders (excluding soft-deleted documents)
    const pendingOrdersCount = await Order.countDocuments({
      status: 'Pending',
      isDeleted: { $ne: true },
    });
    const completedOrdersCount = await Order.countDocuments({
      status: 'Completed',
      isDeleted: { $ne: true },
    });
    const processingOrdersCount = await Order.countDocuments({
      status: 'Processing',
      isDeleted: { $ne: true },
    });

    // Get additional statistics for messages (excluding soft-deleted documents)
    const newMessagesCount = await Contact.countDocuments({
      status: 'New',
      isDeleted: { $ne: true },
    });
    const respondedMessagesCount = await Contact.countDocuments({
      status: 'Responded',
      isDeleted: { $ne: true },
    });

    const statistics = {
      success: true,
      data: {
        products: {
          total: productsCount,
        },
        orders: {
          total: ordersCount,
          pending: pendingOrdersCount,
          processing: processingOrdersCount,
          completed: completedOrdersCount,
        },
        testimonials: {
          total: testimonialsCount,
        },
        messages: {
          total: messagesCount,
          new: newMessagesCount,
          responded: respondedMessagesCount,
        },
        subscribers: {
          total: subscribersCount,
        },
      },
    };

    res.status(200).json(statistics);
  } catch (error) {
    return next(new ApiError('Error fetching statistics', 500));
  }
});

/**
 * Get basic home page data
 * Returns a simple welcome message and basic stats
 */
const getHomeData = catchAsync(async (req, res, next) => {
  try {
    const totalProducts = await Product.countDocuments({
      isDeleted: { $ne: true },
    });
    const totalOrders = await Order.countDocuments({
      isDeleted: { $ne: true },
    });

    const homeData = {
      success: true,
      message: 'Welcome to LinkIt Backend API',
      data: {
        totalProducts,
        totalOrders,
        timestamp: new Date().toISOString(),
      },
    };

    res.status(200).json(homeData);
  } catch (error) {
    return next(new ApiError('Error fetching home data', 500));
  }
});

module.exports = {
  getStatistics,
  getHomeData,
};
