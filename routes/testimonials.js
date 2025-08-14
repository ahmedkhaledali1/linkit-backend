const express = require('express');
const {
  getAllTestimonials,
  createTestimonial,
  getOneTestimonial,
  updateTestimonial,
  deleteTestimonial,
} = require('../controllers/testimonials.controllers');
const { protect, restrictTo } = require('../controllers/authConroller');
const { uploadImage } = require('../utils/fileUpload');

const router = express.Router();

// Configure multer for testimonial image uploads
const uploadTestimonialImage = uploadImage.single('image');

// Public routes
router
  .route('/')
  .get(getAllTestimonials)
  .post(uploadTestimonialImage, createTestimonial);

router
  .route('/:id')
  .get(getOneTestimonial)
  .patch(uploadTestimonialImage, updateTestimonial)
  .delete(deleteTestimonial);

module.exports = router;
