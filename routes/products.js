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
    // console.log('imagePaths..', imageP / aths);

    // console.log('imagePaths', imagePaths);
    // Add the image paths to the request body
    if (imagePaths && imagePaths.length > 0) {
      // If images already exist in body, merge them

      req.body.cardDesigns = req.body.cardDesigns.map((cardDesign, index) => ({
        ...cardDesign,
        image: cardDesign.image ? cardDesign.image : imagePaths[index],
      }));
    } else {
      req.body.images = imagePaths;
    }
  }
  next();
};
const parseFormDataJSON = (req, res, next) => {
  try {
    if (req.body.cardDesigns && typeof req.body.cardDesigns === 'string') {
      req.body.cardDesigns = JSON.parse(req.body.cardDesigns);
    }
    if (req.body.colors && typeof req.body.colors === 'string') {
      req.body.colors = JSON.parse(req.body.colors);
    }
  } catch (error) {
    console.error('Error parsing JSON fields from form-data', error);
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
  .post(
    protect,
    uploadMultipleImages,
    processUploadedImages,
    parseFormDataJSON,
    createProduct
  );

router
  .route('/:id')
  .get(getOneProduct)
  .patch(
    protect,
    uploadMultipleImages,
    processUploadedImages,
    parseFormDataJSON,
    updateProduct
  )
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
