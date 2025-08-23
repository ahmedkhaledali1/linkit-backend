const express = require('express');
const {
  getAllCountries,
  getCountry,
  createCountry,
  updateCountry,
  deleteCountry,
  restoreCountry,
  getDeletedCountries,
  hardDeleteCountry,
  getCountriesWithCities,
  getCitiesByCountry,
  getDeliveryFee,
  getCountryStats,
} = require('../controllers/countries.controllers');

const router = express.Router();

// Public routes (no authentication required)
router.get('/with-cities', getCountriesWithCities);
router.get('/:id/cities', getCitiesByCountry);
router.get('/:countryId/cities/:cityId/delivery-fee', getDeliveryFee);

// Admin routes (authentication required)
router.route('/').get(getAllCountries).post(createCountry);

router.route('/stats').get(getCountryStats);

router.route('/deleted').get(getDeletedCountries);

router.route('/:id').get(getCountry).patch(updateCountry).delete(deleteCountry);

router.route('/:id/restore').patch(restoreCountry);

router.route('/:id/hard-delete').delete(hardDeleteCountry);

module.exports = router;
