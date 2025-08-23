const express = require('express');
const {
  getAllSubscribers,
  getSubscriber,
  updateSubscriber,
  deleteSubscriber,
  restoreSubscriber,
  getDeletedSubscribers,
  hardDeleteSubscriber,
  subscribe,
  unsubscribe,
  checkSubscription,
  getSubscriberStats,
  bulkSubscribe,
  exportSubscribers,
} = require('../controllers/subscribers.controllers');

const router = express.Router();

// Public routes (no authentication required)
router.post('/subscribe', subscribe);
router.post('/unsubscribe', unsubscribe);
router.post('/check-subscription', checkSubscription);

// Admin routes (authentication required)
router.route('/').get(getAllSubscribers).post(bulkSubscribe);

router.route('/stats').get(getSubscriberStats);

router.route('/export').get(exportSubscribers);

router.route('/deleted').get(getDeletedSubscribers);

router
  .route('/:id')
  .get(getSubscriber)
  .patch(updateSubscriber)
  .delete(deleteSubscriber);

router.route('/:id/restore').patch(restoreSubscriber);

router.route('/:id/hard-delete').delete(hardDeleteSubscriber);

module.exports = router;
