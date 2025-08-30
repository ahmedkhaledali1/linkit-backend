const express = require('express');
const { protect, restrictTo } = require('../controllers/authConroller');
const { uploadImage } = require('../utils/fileUpload');
const {
  getAddons,
  createAddon,
  updateAddon,
} = require('../controllers/addons.conroller');

const router = express.Router();

router.route('/').get(getAddons).post(protect, createAddon);
router.route('/:id').get(getAddons).patch(updateAddon);

module.exports = router;
