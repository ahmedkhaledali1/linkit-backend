const express = require('express');
const {
  getAllContacts,
  createContact,
  getOneContact,
  updateContact,
  deleteContact,
} = require('../controllers/contact.controllers');
const { protect, restrictTo } = require('../controllers/authConroller');

const router = express.Router();

// Public routes (no authentication required)
router.route('/').get(getAllContacts).post(createContact);

router
  .route('/:id')
  .get(getOneContact)
  .patch(protect, restrictTo('admin'), updateContact)
  .delete(protect, restrictTo('admin'), deleteContact);

module.exports = router;
