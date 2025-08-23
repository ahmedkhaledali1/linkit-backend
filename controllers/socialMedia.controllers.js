const SocialMedia = require('../models/socialMediaModel');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/apiError');

// Use factory functions for basic CRUD operations
exports.getAllSocialMedia = factory.getAll(SocialMedia);
exports.getSocialMedia = factory.getOne(SocialMedia);
exports.createSocialMedia = factory.createOne(SocialMedia);
exports.updateSocialMedia = factory.updateOne(SocialMedia);
exports.deleteSocialMedia = factory.deleteOne(SocialMedia);
exports.restoreSocialMedia = factory.restoreOne(SocialMedia);
exports.getDeletedSocialMedia = factory.getDeleted(SocialMedia);
exports.hardDeleteSocialMedia = factory.hardDeleteOne(SocialMedia);

/**
 * Get active social media links for public display
 * GET /api/v1/social-media/public
 */
exports.getPublicSocialMedia = catchAsync(async (req, res, next) => {
  const socialMedia = await SocialMedia.getActiveSocialMedia();

  res.status(200).json({
    status: 'success',
    results: socialMedia.length,
    data: {
      data: socialMedia,
    },
  });
});

/**
 * Get social media by platform
 * GET /api/v1/social-media/platform/:platform
 */
exports.getSocialMediaByPlatform = catchAsync(async (req, res, next) => {
  const { platform } = req.params;

  const validPlatforms = ['instagram', 'facebook', 'linkedin', 'whatsapp'];
  if (!validPlatforms.includes(platform)) {
    return next(
      new ApiError(
        'Invalid platform. Must be instagram, facebook, linkedin, or whatsapp',
        400
      )
    );
  }

  const socialMedia = await SocialMedia.getByPlatform(platform);

  if (!socialMedia) {
    return next(
      new ApiError(`No social media found for platform: ${platform}`, 404)
    );
  }

  res.status(200).json({
    status: 'success',
    data: {
      data: socialMedia,
    },
  });
});

/**
 * Update social media by platform
 * PATCH /api/v1/social-media/platform/:platform
 */
exports.updateSocialMediaByPlatform = catchAsync(async (req, res, next) => {
  const { platform } = req.params;

  const validPlatforms = ['instagram', 'facebook', 'linkedin', 'whatsapp'];
  if (!validPlatforms.includes(platform)) {
    return next(
      new ApiError(
        'Invalid platform. Must be instagram, facebook, linkedin, or whatsapp',
        400
      )
    );
  }

  const socialMedia = await SocialMedia.findOneAndUpdate(
    {
      platform,
      isDeleted: { $ne: true },
    },
    req.body,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!socialMedia) {
    return next(
      new ApiError(`No social media found for platform: ${platform}`, 404)
    );
  }

  res.status(200).json({
    status: 'success',
    data: {
      data: socialMedia,
    },
  });
});

/**
 * Get social media statistics
 * GET /api/v1/social-media/stats
 */
exports.getSocialMediaStats = catchAsync(async (req, res, next) => {
  const totalSocialMedia = await SocialMedia.countDocuments({
    isDeleted: { $ne: true },
  });
  const activeSocialMedia = await SocialMedia.countDocuments({
    isActive: true,
    isDeleted: { $ne: true },
  });

  // Get count by platform
  const platformStats = await SocialMedia.aggregate([
    {
      $match: { isDeleted: { $ne: true } },
    },
    {
      $group: {
        _id: '$platform',
        count: { $sum: 1 },
        activeCount: {
          $sum: { $cond: ['$isActive', 1, 0] },
        },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);

  // Get recent updates
  const recentUpdates = await SocialMedia.find({ isDeleted: { $ne: true } })
    .sort({ updatedAt: -1 })
    .limit(5)
    .select('platform displayName updatedAt');

  res.status(200).json({
    status: 'success',
    data: {
      totalSocialMedia,
      activeSocialMedia,
      platformStats,
      recentUpdates,
    },
  });
});

/**
 * Bulk update social media display order
 * PATCH /api/v1/social-media/reorder
 */
exports.reorderSocialMedia = catchAsync(async (req, res, next) => {
  const { orderData } = req.body;

  if (!orderData || !Array.isArray(orderData)) {
    return next(new ApiError('Order data array is required', 400));
  }

  const updatePromises = orderData.map((item) =>
    SocialMedia.findByIdAndUpdate(
      item.id,
      { displayOrder: item.order },
      { new: true, runValidators: true }
    )
  );

  const updatedSocialMedia = await Promise.all(updatePromises);

  res.status(200).json({
    status: 'success',
    message: 'Social media display order updated successfully',
    data: {
      data: updatedSocialMedia,
    },
  });
});

/**
 * Toggle social media active status
 * PATCH /api/v1/social-media/:id/toggle-status
 */
exports.toggleSocialMediaStatus = catchAsync(async (req, res, next) => {
  const socialMedia = await SocialMedia.findOneAndUpdate(
    {
      _id: req.params.id,
      isDeleted: { $ne: true },
    },
    [
      {
        $set: {
          isActive: { $not: '$isActive' },
        },
      },
    ],
    {
      new: true,
      runValidators: true,
    }
  );

  if (!socialMedia) {
    return next(new ApiError('No social media found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    message: `Social media ${
      socialMedia.isActive ? 'activated' : 'deactivated'
    } successfully`,
    data: {
      data: socialMedia,
    },
  });
});

/**
 * Validate social media URL
 * POST /api/v1/social-media/validate-url
 */
exports.validateSocialMediaUrl = catchAsync(async (req, res, next) => {
  const { platform, url } = req.body;

  if (!platform || !url) {
    return next(new ApiError('Platform and URL are required', 400));
  }

  const validPlatforms = ['instagram', 'facebook', 'linkedin', 'whatsapp'];
  if (!validPlatforms.includes(platform)) {
    return next(new ApiError('Invalid platform', 400));
  }

  // URL validation logic (same as in model)
  const urlLower = url.toLowerCase();
  let isValid = false;

  switch (platform) {
    case 'instagram':
      isValid =
        urlLower.includes('instagram.com') || urlLower.includes('instagr.am');
      break;
    case 'facebook':
      isValid =
        urlLower.includes('facebook.com') || urlLower.includes('fb.com');
      break;
    case 'linkedin':
      isValid = urlLower.includes('linkedin.com');
      break;
    case 'whatsapp':
      isValid =
        urlLower.includes('wa.me') ||
        urlLower.includes('whatsapp.com') ||
        /^\+?[1-9]\d{1,14}$/.test(url);
      break;
  }

  res.status(200).json({
    status: 'success',
    data: {
      isValid,
      platform,
      url,
      message: isValid
        ? 'URL is valid'
        : 'URL is not valid for the selected platform',
    },
  });
});

/**
 * Get social media links for footer/contact page
 * GET /api/v1/social-media/links
 */
exports.getSocialMediaLinks = catchAsync(async (req, res, next) => {
  const socialMedia = await SocialMedia.find({
    isActive: true,
    isDeleted: { $ne: true },
  })
    .select('platform url displayName username platformIcon')
    .sort('displayOrder');

  const links = socialMedia.map((item) => ({
    platform: item.platform,
    url: item.url,
    displayName: item.displayName || item.platformDisplayName,
    username: item.username,
    icon: item.platformIcon,
  }));

  res.status(200).json({
    status: 'success',
    data: {
      links,
      totalLinks: links.length,
    },
  });
});
