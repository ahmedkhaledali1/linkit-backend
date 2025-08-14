const Package = require('../models/packageModel');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/apiError');

// Get all packages
exports.getAllPackages = factory.getAll(Package);

// Get single package
exports.getOnePackage = factory.getOne(Package);

// Create new package (admin only)
exports.createPackage = factory.createOne(Package);

// Update package (admin only)
exports.updatePackage = factory.updateOne(Package);

// Delete package (admin only)
exports.deletePackage = factory.deleteOne(Package);

// Get active packages for public display
exports.getActivePackages = catchAsync(async (req, res, next) => {
  const packages = await Package.getActivePackages();

  res.status(200).json({
    status: 'success',
    results: packages.length,
    data: {
      packages,
    },
  });
});

// Get packages by type
exports.getPackagesByType = catchAsync(async (req, res, next) => {
  const { type } = req.params;

  const validTypes = ['starter', 'standard', 'enterprise'];
  if (!validTypes.includes(type)) {
    return next(new AppError('Invalid package type', 400));
  }

  const packages = await Package.getByType(type);

  res.status(200).json({
    status: 'success',
    results: packages.length,
    data: {
      packages,
      type,
    },
  });
});

// Find package by quantity
exports.findPackageByQuantity = catchAsync(async (req, res, next) => {
  const { quantity } = req.query;

  if (!quantity || isNaN(quantity) || quantity < 10) {
    return next(
      new AppError('Please provide a valid quantity (minimum 10)', 400)
    );
  }

  const package = await Package.findByQuantity(parseInt(quantity));

  if (!package) {
    return next(new AppError('No package found for this quantity', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      package,
      quantity: parseInt(quantity),
    },
  });
});

// Get pricing information for a quantity
exports.getPricingInfo = catchAsync(async (req, res, next) => {
  const { quantity } = req.query;

  if (!quantity || isNaN(quantity) || quantity < 10) {
    return next(
      new AppError('Please provide a valid quantity (minimum 10)', 400)
    );
  }

  const qty = parseInt(quantity);
  const package = await Package.findByQuantity(qty);

  if (!package) {
    return next(new AppError('No package found for this quantity', 404));
  }

  let pricingInfo = {
    quantity: qty,
    package: {
      name: package.name,
      type: package.packageType,
      features: package.features,
    },
  };

  if (package.pricing.isFixedPrice) {
    // Fixed pricing (50-99 cards)
    pricingInfo.pricing = {
      type: 'fixed',
      pricePerCard: package.pricing.pricePerCard,
      totalPrice: package.pricing.pricePerCard * qty,
      currency: package.pricing.currency,
    };
  } else {
    // Custom pricing (10-49 and 100+ cards)
    pricingInfo.pricing = {
      type: 'custom',
      message: 'Custom pricing available - contact us for a personalized quote',
    };
  }

  pricingInfo.deliveryInfo = package.deliveryInfo;

  res.status(200).json({
    status: 'success',
    data: pricingInfo,
  });
});

// Seed initial packages (development only)
exports.seedPackages = catchAsync(async (req, res, next) => {
  // Check if packages already exist
  const existingPackages = await Package.countDocuments();
  if (existingPackages > 0) {
    return next(new AppError('Packages already exist', 400));
  }

  const seedPackages = [
    {
      name: 'Starter Package',
      quantityRange: { min: 10, max: 49 },
      pricing: {
        pricePerCard: 0, // Custom pricing
        currency: 'JOD',
        isFixedPrice: false,
      },
      features: [
        'Custom branding',
        'Free delivery',
        'Basic support',
        'Standard design templates',
      ],
      description:
        'Perfect for small teams and startups. Custom pricing based on your specific needs.',
      packageType: 'starter',
      displayOrder: 1,
      deliveryInfo: {
        estimatedDays: 7,
        freeDelivery: true,
      },
    },
    {
      name: 'Standard Package',
      quantityRange: { min: 50, max: 99 },
      pricing: {
        pricePerCard: 15,
        currency: 'JOD',
        isFixedPrice: true,
      },
      features: [
        'Custom branding',
        'Free delivery',
        'Priority support',
        'Design assistance',
        'Quality guarantee',
      ],
      description:
        'Fixed pricing with bulk benefits. Great value for medium-sized teams.',
      packageType: 'standard',
      displayOrder: 2,
      deliveryInfo: {
        estimatedDays: 10,
        freeDelivery: true,
      },
    },
    {
      name: 'Enterprise Package',
      quantityRange: { min: 100, max: 999999 },
      pricing: {
        pricePerCard: 0, // Custom pricing
        currency: 'JOD',
        isFixedPrice: false,
      },
      features: [
        'Custom branding',
        'Free delivery',
        'Dedicated support',
        'Design assistance',
        'Volume discounts',
        'Account manager',
        'Rush delivery options',
      ],
      description:
        'Enterprise pricing with maximum savings and premium support.',
      packageType: 'enterprise',
      displayOrder: 3,
      deliveryInfo: {
        estimatedDays: 10,
        freeDelivery: true,
      },
    },
  ];

  const createdPackages = await Package.insertMany(seedPackages);

  res.status(201).json({
    status: 'success',
    message: 'Packages seeded successfully',
    data: {
      packages: createdPackages,
    },
  });
});
