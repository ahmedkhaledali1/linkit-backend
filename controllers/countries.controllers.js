const Country = require('../models/countryModel');
const City = require('../models/cityModel');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/apiError');

// Use factory functions for basic CRUD operations
exports.getAllCountries = factory.getAll(Country);
exports.getCountry = factory.getOne(Country);
exports.createCountry = factory.createOne(Country);
exports.updateCountry = factory.updateOne(Country);
exports.deleteCountry = factory.deleteOne(Country);
exports.restoreCountry = factory.restoreOne(Country);
exports.getDeletedCountries = factory.getDeleted(Country);
exports.hardDeleteCountry = factory.hardDeleteOne(Country);

/**
 * Get all countries with cities populated
 * GET /api/v1/countries/with-cities
 */
exports.getCountriesWithCities = catchAsync(async (req, res, next) => {
  const countries = await Country.getAllCountries().populate('cities');

  res.status(200).json({
    status: 'success',
    results: countries.length,
    data: {
      data: countries,
    },
  });
});

/**
 * Get cities by country ID
 * GET /api/v1/countries/:id/cities
 */
exports.getCitiesByCountry = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const country = await Country.findById(id).populate('cities');

  if (!country) {
    return next(new ApiError('Country not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      country: country.name,
      cities: country.cities,
      citiesCount: country.cities.length,
    },
  });
});

/**
 * Get delivery fee for a specific city
 * GET /api/v1/countries/:countryId/cities/:cityId/delivery-fee
 */
exports.getDeliveryFee = catchAsync(async (req, res, next) => {
  const { countryId, cityId } = req.params;

  // Verify country exists
  const country = await Country.findById(countryId);
  if (!country) {
    return next(new ApiError('Country not found', 404));
  }

  // Get city with delivery fee
  const city = await City.findById(cityId).populate('country', 'name');
  if (!city) {
    return next(new ApiError('City not found', 404));
  }

  // Verify city belongs to the specified country
  if (city.country._id.toString() !== countryId) {
    return next(
      new ApiError('City does not belong to the specified country', 400)
    );
  }

  res.status(200).json({
    status: 'success',
    data: {
      country: country.name,
      city: city.name,
      deliveryFee: city.deliveryFee,
    },
  });
});

/**
 * Get country statistics
 * GET /api/v1/countries/stats
 */
exports.getCountryStats = catchAsync(async (req, res, next) => {
  const totalCountries = await Country.countDocuments({
    isDeleted: { $ne: true },
  });

  // Get total cities across all countries
  const countriesWithCities = await Country.aggregate([
    {
      $match: { isDeleted: { $ne: true } },
    },
    {
      $addFields: {
        citiesCount: { $size: '$cities' },
      },
    },
    {
      $group: {
        _id: null,
        totalCities: { $sum: '$citiesCount' },
        avgCitiesPerCountry: { $avg: '$citiesCount' },
      },
    },
  ]);

  // Get countries with most cities
  const topCountries = await Country.aggregate([
    {
      $match: { isDeleted: { $ne: true } },
    },
    {
      $addFields: {
        citiesCount: { $size: '$cities' },
      },
    },
    {
      $sort: { citiesCount: -1 },
    },
    {
      $limit: 5,
    },
    {
      $project: {
        name: 1,
        citiesCount: 1,
      },
    },
  ]);

  const stats = {
    totalCountries,
    totalCities: countriesWithCities[0]?.totalCities || 0,
    avgCitiesPerCountry: countriesWithCities[0]?.avgCitiesPerCountry || 0,
    topCountries,
  };

  res.status(200).json({
    status: 'success',
    data: stats,
  });
});
