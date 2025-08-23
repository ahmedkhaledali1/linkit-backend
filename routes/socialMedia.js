const express = require('express');
const {
  getAllSocialMedia,
  getSocialMedia,
  createSocialMedia,
  updateSocialMedia,
  deleteSocialMedia,
  restoreSocialMedia,
  getDeletedSocialMedia,
  hardDeleteSocialMedia,
  getPublicSocialMedia,
  getSocialMediaByPlatform,
  updateSocialMediaByPlatform,
  getSocialMediaStats,
  reorderSocialMedia,
  toggleSocialMediaStatus,
  validateSocialMediaUrl,
  getSocialMediaLinks,
} = require('../controllers/socialMedia.controllers');

const router = express.Router();

// Public routes (no authentication required)
router.get('/public', getPublicSocialMedia);
router.get('/links', getSocialMediaLinks);
router.get('/platform/:platform', getSocialMediaByPlatform);

// Admin routes (authentication required)
router.route('/').get(getAllSocialMedia).post(createSocialMedia);

router.route('/stats').get(getSocialMediaStats);

router.route('/validate-url').post(validateSocialMediaUrl);

router.route('/reorder').patch(reorderSocialMedia);

router.route('/deleted').get(getDeletedSocialMedia);

router
  .route('/:id')
  .get(getSocialMedia)
  .patch(updateSocialMedia)
  .delete(deleteSocialMedia);

router.route('/:id/restore').patch(restoreSocialMedia);

router.route('/:id/hard-delete').delete(hardDeleteSocialMedia);

router.route('/:id/toggle-status').patch(toggleSocialMediaStatus);

// Platform-specific update route
router.route('/platform/:platform').patch(updateSocialMediaByPlatform);

module.exports = router;
