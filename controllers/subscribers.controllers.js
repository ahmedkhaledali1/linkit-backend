const Subscriber = require('../models/subscriberModel');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/apiError');

// Use factory functions for basic CRUD operations
exports.getAllSubscribers = factory.getAll(Subscriber);
exports.getSubscriber = factory.getOne(Subscriber);
exports.updateSubscriber = factory.updateOne(Subscriber);
exports.deleteSubscriber = factory.deleteOne(Subscriber);
exports.restoreSubscriber = factory.restoreOne(Subscriber);
exports.getDeletedSubscribers = factory.getDeleted(Subscriber);
exports.hardDeleteSubscriber = factory.hardDeleteOne(Subscriber);

/**
 * Subscribe a new email
 * POST /api/v1/subscribers/subscribe
 */
exports.subscribe = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new ApiError('Email is required', 400));
  }

  // Check if email is already subscribed
  const existingSubscriber = await Subscriber.isEmailSubscribed(email);
  if (existingSubscriber) {
    return next(new ApiError('This email is already subscribed', 400));
  }

  // Create new subscriber
  const subscriber = await Subscriber.create({ email });

  res.status(201).json({
    status: 'success',
    message: 'Successfully subscribed to newsletter',
    data: {
      data: subscriber,
    },
  });
});

/**
 * Unsubscribe an email
 * POST /api/v1/subscribers/unsubscribe
 */
exports.unsubscribe = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new ApiError('Email is required', 400));
  }

  // Find and soft delete the subscriber
  const subscriber = await Subscriber.findOneAndUpdate(
    {
      email: email.toLowerCase(),
      isDeleted: { $ne: true },
    },
    {
      isDeleted: true,
      deletedAt: new Date(),
    },
    { new: true }
  );

  if (!subscriber) {
    return next(new ApiError('Email not found in subscribers list', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Successfully unsubscribed from newsletter',
    data: null,
  });
});

/**
 * Check if email is subscribed
 * POST /api/v1/subscribers/check-subscription
 */
exports.checkSubscription = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new ApiError('Email is required', 400));
  }

  const subscriber = await Subscriber.isEmailSubscribed(email);

  res.status(200).json({
    status: 'success',
    data: {
      isSubscribed: !!subscriber,
      email: email.toLowerCase(),
    },
  });
});

/**
 * Get subscriber statistics
 * GET /api/v1/subscribers/stats
 */
exports.getSubscriberStats = catchAsync(async (req, res, next) => {
  const totalSubscribers = await Subscriber.getSubscriberCount();
  const recentSubscribers = await Subscriber.getRecentSubscribers(5);

  // Get subscribers count by month (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const monthlyStats = await Subscriber.aggregate([
    {
      $match: {
        createdAt: { $gte: sixMonthsAgo },
        isDeleted: { $ne: true },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      totalSubscribers,
      recentSubscribers,
      monthlyStats,
    },
  });
});

/**
 * Bulk subscribe emails (for admin use)
 * POST /api/v1/subscribers/bulk-subscribe
 */
exports.bulkSubscribe = catchAsync(async (req, res, next) => {
  const { emails } = req.body;

  if (!emails || !Array.isArray(emails) || emails.length === 0) {
    return next(new ApiError('Emails array is required', 400));
  }

  const results = {
    successful: [],
    failed: [],
    alreadySubscribed: [],
  };

  for (const email of emails) {
    try {
      // Check if email is valid
      if (!email || typeof email !== 'string') {
        results.failed.push({ email, reason: 'Invalid email format' });
        continue;
      }

      // Check if already subscribed
      const existingSubscriber = await Subscriber.isEmailSubscribed(email);
      if (existingSubscriber) {
        results.alreadySubscribed.push(email);
        continue;
      }

      // Create subscriber
      const subscriber = await Subscriber.create({ email });
      results.successful.push(subscriber);
    } catch (error) {
      results.failed.push({ email, reason: error.message });
    }
  }

  res.status(200).json({
    status: 'success',
    message: 'Bulk subscription completed',
    data: {
      totalProcessed: emails.length,
      successful: results.successful.length,
      failed: results.failed.length,
      alreadySubscribed: results.alreadySubscribed.length,
      details: results,
    },
  });
});

/**
 * Export subscribers list (for admin use)
 * GET /api/v1/subscribers/export
 */
exports.exportSubscribers = catchAsync(async (req, res, next) => {
  const subscribers = await Subscriber.find({ isDeleted: { $ne: true } })
    .select('email createdAt')
    .sort({ createdAt: -1 });

  const csvData = subscribers.map((subscriber) => ({
    email: subscriber.email,
    subscribedAt: subscriber.createdAt.toISOString(),
  }));

  res.status(200).json({
    status: 'success',
    data: {
      totalSubscribers: subscribers.length,
      subscribers: csvData,
    },
  });
});
