const City = require('../models/cityModel');
const Country = require('../models/countryModel');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/apiError');

// Use factory functions for basic CRUD operations
exports.getAllCities = factory.getAll(City, {
  path: 'country',
  select: 'name',
});
exports.getCity = factory.getOne(City);
exports.createCity = factory.createOne(City);
exports.updateCity = factory.updateOne(City);
exports.deleteCity = factory.deleteOne(City);
exports.restoreCity = factory.restoreOne(City);
exports.getDeletedCities = factory.getDeleted(City);
exports.hardDeleteCity = factory.hardDeleteOne(City);

/**
 * Get all cities with country information
 * GET /api/v1/cities/with-countries
 */
exports.getCitiesWithCountries = catchAsync(async (req, res, next) => {
  const cities = await City.getActiveCities();

  res.status(200).json({
    status: 'success',
    results: cities.length,
    data: {
      data: cities,
    },
  });
});

/**
 * Get cities by country ID
 * GET /api/v1/cities/country/:countryId
 */
exports.getCitiesByCountry = catchAsync(async (req, res, next) => {
  const { countryId } = req.params;

  // Verify country exists
  const country = await Country.findById(countryId);
  if (!country) {
    return next(new ApiError('Country not found', 404));
  }

  const cities = await City.getCitiesByCountry(countryId);

  res.status(200).json({
    status: 'success',
    data: {
      country: country.name,
      cities: cities,
      citiesCount: cities.length,
    },
  });
});

/**
 * Get delivery fee for a specific city
 * GET /api/v1/cities/:id/delivery-fee
 */
exports.getDeliveryFee = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const city = await City.getDeliveryFee(id);

  if (!city) {
    return next(new ApiError('City not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      city: city.name,
      country: city.country.name,
      deliveryFee: city.deliveryFee,
    },
  });
});

/**
 * Get city by name
 * GET /api/v1/cities/name/:cityName
 */
exports.getCityByName = catchAsync(async (req, res, next) => {
  const { cityName } = req.params;

  const city = await City.getByName(cityName);

  if (!city) {
    return next(new ApiError(`City '${cityName}' not found`, 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      data: city,
    },
  });
});

/**
 * Create city for a specific country
 * POST /api/v1/cities/country/:countryId
 */
exports.createCityForCountry = catchAsync(async (req, res, next) => {
  const { countryId } = req.params;
  const { name, deliveryFee, isActive, displayOrder } = req.body;

  // Verify country exists
  const country = await Country.findById(countryId);
  if (!country) {
    return next(new ApiError('Country not found', 404));
  }

  // Create city
  const city = await City.create({
    name,
    deliveryFee,
    country: countryId,
    isActive: isActive !== undefined ? isActive : true,
    displayOrder: displayOrder || 0,
  });

  // Populate country information
  await city.populate('country', 'name code');

  res.status(201).json({
    status: 'success',
    message: 'City created successfully',
    data: {
      data: city,
    },
  });
});

/**
 * Get city statistics
 * GET /api/v1/cities/stats
 */
exports.getCityStats = catchAsync(async (req, res, next) => {
  const totalCities = await City.countDocuments({ isDeleted: { $ne: true } });

  // Get cities by country
  const citiesByCountry = await City.aggregate([
    {
      $match: { isDeleted: { $ne: true } },
    },
    {
      $lookup: {
        from: 'countries',
        localField: 'country',
        foreignField: '_id',
        as: 'country',
      },
    },
    {
      $unwind: '$country',
    },
    {
      $group: {
        _id: '$country._id',
        countryName: { $first: '$country.name' },
        citiesCount: { $sum: 1 },
        avgDeliveryFee: { $avg: '$deliveryFee' },
      },
    },
    {
      $sort: { citiesCount: -1 },
    },
  ]);

  // Get average delivery fee
  const avgDeliveryFee = await City.aggregate([
    {
      $match: { isDeleted: { $ne: true } },
    },
    {
      $group: {
        _id: null,
        avgDeliveryFee: { $avg: '$deliveryFee' },
        minDeliveryFee: { $min: '$deliveryFee' },
        maxDeliveryFee: { $max: '$deliveryFee' },
      },
    },
  ]);

  const stats = {
    totalCities,
    avgDeliveryFee: avgDeliveryFee[0]?.avgDeliveryFee || 0,
    minDeliveryFee: avgDeliveryFee[0]?.minDeliveryFee || 0,
    maxDeliveryFee: avgDeliveryFee[0]?.maxDeliveryFee || 0,
    citiesByCountry,
  };

  res.status(200).json({
    status: 'success',
    data: stats,
  });
});

/**
 * Bulk create cities for a country
 * POST /api/v1/cities/country/:countryId/bulk
 */
exports.bulkCreateCities = catchAsync(async (req, res, next) => {
  const { countryId } = req.params;
  const { cities } = req.body;

  if (!cities || !Array.isArray(cities) || cities.length === 0) {
    return next(new ApiError('Cities array is required', 400));
  }

  // Verify country exists
  const country = await Country.findById(countryId);
  if (!country) {
    return next(new ApiError('Country not found', 404));
  }

  // Validate cities data
  for (const city of cities) {
    if (!city.name || city.deliveryFee === undefined) {
      return next(
        new ApiError('Each city must have name and deliveryFee', 400)
      );
    }
  }

  // Add country reference to each city
  const citiesWithCountry = cities.map((city) => ({
    ...city,
    country: countryId,
    isActive: city.isActive !== undefined ? city.isActive : true,
    displayOrder: city.displayOrder || 0,
  }));

  const createdCities = await City.create(citiesWithCountry);

  res.status(201).json({
    status: 'success',
    message: `${cities.length} cities created successfully`,
    data: {
      data: createdCities,
    },
  });
});

/**
 * Toggle city status
 * PATCH /api/v1/cities/:id/toggle-status
 */
exports.toggleCityStatus = catchAsync(async (req, res, next) => {
  const city = await City.findByIdAndUpdate(
    req.params.id,
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
  ).populate('country', 'name code');

  if (!city) {
    return next(new ApiError('City not found', 404));
  }

  res.status(200).json({
    status: 'success',
    message: `City status ${
      city.isActive ? 'activated' : 'deactivated'
    } successfully`,
    data: {
      data: city,
    },
  });
});
