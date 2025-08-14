const Testimonial = require('../models/testimonialModel');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/apiError');
const { getRelativeFilePath } = require('../utils/fileUpload');

// Get all testimonials
exports.getAllTestimonials = factory.getAll(Testimonial);

// Get single testimonial
exports.getOneTestimonial = factory.getOne(Testimonial);

// Create new testimonial
exports.createTestimonial = catchAsync(async (req, res, next) => {
  // Handle image upload
  if (req.file) {
    req.body.image = getRelativeFilePath(req.file);
  }

  // Create the testimonial
  const newTestimonial = await Testimonial.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      testimonial: newTestimonial,
    },
  });
});

// Update testimonial
exports.updateTestimonial = catchAsync(async (req, res, next) => {
  // Handle image upload
  if (req.file) {
    req.body.image = getRelativeFilePath(req.file);
  }

  const testimonial = await Testimonial.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!testimonial) {
    return next(new AppError('No testimonial found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      testimonial,
    },
  });
});

// Delete testimonial
exports.deleteTestimonial = factory.deleteOne(Testimonial);
