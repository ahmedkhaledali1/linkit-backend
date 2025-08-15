const express = require('express');
const {
  getAllProducts,
  createProduct,
  getOneProduct,
  updateProduct,
  deleteProduct,
  aliasTopProducts,
  aliasCheapProducts,
  getProductStats,
  getProductsByPriceRange,
  getProductsByColor,
  addColorToProduct,
  removeColorFromProduct,
  addImageToProduct,
  removeImageFromProduct,
  getMyProducts,
  getCreatedBy,
} = require('../controllers/products.controllers');
const { protect, restrictTo } = require('../controllers/authConroller');
const {
  uploadMultipleImages,
  getRelativeFilePath,
} = require('../utils/fileUpload');

const router = express.Router();

// Middleware to process uploaded images
const processUploadedImages = (req, res, next) => {
  if (req.files && req.files.length > 0) {
    // Convert uploaded files to relative paths for database storage
    const imagePaths = req.files.map((file) => getRelativeFilePath(file));

    // Add the image paths to the request body
    if (req.body.images) {
      // If images already exist in body, merge them
      const existingImages = Array.isArray(req.body.images)
        ? req.body.images
        : [req.body.images];
      req.body.images = [...existingImages, ...imagePaths];
    } else {
      req.body.images = imagePaths;
    }
  }
  next();
};

// Special routes with aliases (no upload needed)
router.route('/top-5-expensive').get(aliasTopProducts, getAllProducts);
router.route('/cheap-products').get(aliasCheapProducts, getAllProducts);
router.route('/product-stats').get(getProductStats);
router.route('/price-range').get(getProductsByPriceRange);
router.route('/color/:color').get(getProductsByColor);

// Protected routes - user must be logged in
// router.use(protect);

// Routes for logged-in users
router.route('/my-products').get(getMyProducts);

// Product management routes
router
  .route('/')
  .get(getAllProducts)
  .post(protect, uploadMultipleImages, processUploadedImages, createProduct);

router
  .route('/:id')
  .get(protect, getOneProduct)
  .patch(protect, uploadMultipleImages, processUploadedImages, updateProduct)
  .delete(protect, restrictTo('admin', 'user'), deleteProduct);

// Color management routes
router.route('/:id/colors/add').patch(protect, addColorToProduct);
router.route('/:id/colors/remove').patch(protect, removeColorFromProduct);

// Image management routes
router
  .route('/:id/images/add')
  .patch(
    protect,
    uploadMultipleImages,
    processUploadedImages,
    addImageToProduct
  );
router.route('/:id/images/remove').patch(protect, removeImageFromProduct);

module.exports = router;
