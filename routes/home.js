const express = require('express');
const {
  getStatistics,
  getHomeData,
} = require('../controllers/home.controller');

const router = express.Router();

// GET /api/v1/home/statistics - Get dashboard statistics
router.get('/statistics', getStatistics);

// GET /api/v1/home - Get basic home page data
router.get('/', getHomeData);

module.exports = router;
