const express = require('express');
const {
  getAllCities,
  getCity,
  createCity,
  updateCity,
  deleteCity,
  restoreCity,
  getDeletedCities,
  hardDeleteCity,
  getCitiesWithCountries,
  getCitiesByCountry,
  getDeliveryFee,
  getCityByName,
  createCityForCountry,
  getCityStats,
  bulkCreateCities,
  toggleCityStatus,
} = require('../controllers/cities.controllers');

const router = express.Router();

// Public routes (no authentication required)
router.get('/with-countries', getCitiesWithCountries);
router.get('/country/:countryId', getCitiesByCountry);
router.get('/:id/delivery-fee', getDeliveryFee);
router.get('/name/:cityName', getCityByName);

// Admin routes (authentication required)
router.route('/').get(getAllCities).post(createCity);

router.route('/stats').get(getCityStats);

router.route('/deleted').get(getDeletedCities);

router.route('/:id').get(getCity).patch(updateCity).delete(deleteCity);

router.route('/:id/restore').patch(restoreCity);

router.route('/:id/hard-delete').delete(hardDeleteCity);

router.route('/:id/toggle-status').patch(toggleCityStatus);

// Country-specific city routes
router.route('/country/:countryId').post(createCityForCountry);

router.route('/country/:countryId/bulk').post(bulkCreateCities);

module.exports = router;
