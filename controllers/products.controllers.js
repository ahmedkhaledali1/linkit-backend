const express = require('express');
const Product = require('../models/productModel');
const APIFeatures = require('../utils/apiFeatures');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/apiError');

exports.getCreatedBy = (req, res, next) => {
  req.body.createdBy = req.user._id;
  next();
};
exports.getOneProduct = factory.getOne(Product, {
  path: 'createdBy',
  select: 'name email',
});

// Alternative manual implementation (commented out, similar to tours)
// exports.getOneProduct = catchAsync(async (req, res, next) => {
//   const product = await Product.findById(req.params.id).populate({
//     path: 'createdBy',
//     select: 'name email'
//   });
//   if (!product) {
//     return next(new AppError('No product found with that ID', 404));
//   }
//   res.status(200).json({
//     status: 'success',
//     data: {
//       product: product,
//     },
//   });
// });

// Alias for top products (most expensive, newest, etc.)
exports.aliasTopProducts = async (req, res, next) => {
  req.query.limit = '5';
  req.query.fields = 'price,title,createdAt';
  req.query.sort = '-price,-createdAt';

  next();
};

// Alias for cheap products
exports.aliasCheapProducts = async (req, res, next) => {
  req.query.limit = '10';
  req.query.fields = 'price,title,colors';
  req.query.sort = 'price';
  req.query.price = { lte: 50 }; // Products under 50 JOD

  next();
};

// Get all products with filtering, sorting, field limiting, and pagination
exports.getAllProducts = catchAsync(async (req, res) => {
  const features = new APIFeatures(Product.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  const products = await features.query.populate({
    path: 'createdBy',
    select: 'name email',
  });
  // console.log('features..', products);

  res.status(200).json({
    status: 'success',
    results: products.length,
    data: {
      products,
    },
  });
});

// Create new product
exports.createProduct = catchAsync(async (req, res) => {
  // Ensure the product is associated with the logged-in user
  if (!req.body.createdBy) req.body.createdBy = req.user._id;

  // Log uploaded images for debugging
  if (req.body.images && req.body.images.length > 0) {
    // console.log('Uploaded images:', req.body.images);
  }

  // console.log('req.body. ', req.body);

  const newProduct = await Product.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      product: newProduct,
    },
    message: `Product created with   images uploaded`,
  });
});

// Update product
exports.updateProduct = catchAsync(async (req, res, next) => {
  // If new images are uploaded, merge with existing images
  console.log('req.body ', req.body);
  const existingProduct = await Product.findById(req.params.id);
  console.log('existingProduct ', existingProduct);
  // if (req.body.images && req.body.images.length > 0) {
  //   if (existingProduct && existingProduct.images.length > 0) {
  //     // Merge new images with existing ones, avoiding duplicates
  //     const existingImages = existingProduct.images;
  //     const newImages = req.body.images.filter(
  //       (img) => !existingImages.includes(img)
  //     );
  //     req.body.images = [...existingImages, ...newImages];
  //   }
  // }

  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { existingProduct, ...req.body },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!product) {
    return next(new AppError('No product found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      product,
    },
    message:
      req.body.images && req.body.images.length > 0
        ? `Product updated with images`
        : 'Product updated successfully',
  });
});

// Delete product using factory function
exports.deleteProduct = factory.deleteOne(Product);

exports.getProductStats = catchAsync(async (req, res) => {
  const stats = await Product.aggregate([
    {
      $group: {
        _id: null,
        totalProducts: { $sum: 1 },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
        totalColors: { $sum: { $size: '$colors' } },
        avgColorsPerProduct: { $avg: { $size: '$colors' } },
        totalImages: { $sum: { $size: '$images' } },
        avgImagesPerProduct: { $avg: { $size: '$images' } },
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

// Get products by price range
exports.getProductsByPriceRange = catchAsync(async (req, res, next) => {
  const { minPrice, maxPrice } = req.query;

  if (!minPrice || !maxPrice) {
    return next(new AppError('Please provide both minPrice and maxPrice', 400));
  }

  const products = await Product.find({
    price: { $gte: minPrice * 1, $lte: maxPrice * 1 },
  }).populate({
    path: 'createdBy',
    select: 'name email',
  });

  res.status(200).json({
    status: 'success',
    results: products.length,
    data: {
      products,
    },
  });
});

// Get products by color
exports.getProductsByColor = catchAsync(async (req, res, next) => {
  const { color } = req.params;

  if (!color) {
    return next(new AppError('Please provide a color', 400));
  }

  const products = await Product.find({
    colors: { $in: [color.toLowerCase()] },
  }).populate({
    path: 'createdBy',
    select: 'name email',
  });

  res.status(200).json({
    status: 'success',
    results: products.length,
    data: {
      products,
    },
  });
});

// Add color to product
exports.addColorToProduct = catchAsync(async (req, res, next) => {
  const { color } = req.body;

  if (!color) {
    return next(new AppError('Please provide a color', 400));
  }

  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new AppError('No product found with that ID', 404));
  }

  product.addColor(color);
  await product.save();

  res.status(200).json({
    status: 'success',
    data: {
      product,
    },
  });
});

// Remove color from product
exports.removeColorFromProduct = catchAsync(async (req, res, next) => {
  const { color } = req.body;

  if (!color) {
    return next(new AppError('Please provide a color', 400));
  }

  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new AppError('No product found with that ID', 404));
  }

  product.removeColor(color);
  await product.save();

  res.status(200).json({
    status: 'success',
    data: {
      product,
    },
  });
});

// Add image to product (via URL or file upload)
exports.addImageToProduct = catchAsync(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new AppError('No product found with that ID', 404));
  }

  let imagesToAdd = [];

  // Handle uploaded files
  if (req.body.images && req.body.images.length > 0) {
    imagesToAdd = req.body.images;
  }
  // Handle manual URL input
  else if (req.body.imageUrl) {
    imagesToAdd = [req.body.imageUrl];
  }

  if (imagesToAdd.length === 0) {
    return next(
      new AppError('Please provide an image URL or upload image files', 400)
    );
  }

  // Add each image to the product
  imagesToAdd.forEach((imageUrl) => {
    product.addImage(imageUrl);
  });

  await product.save();

  res.status(200).json({
    status: 'success',
    data: {
      product,
    },
    message: `${imagesToAdd.length} image(s) added to product`,
  });
});

// Remove image from product
exports.removeImageFromProduct = catchAsync(async (req, res, next) => {
  const { imageUrl } = req.body;

  if (!imageUrl) {
    return next(new AppError('Please provide an image URL', 400));
  }

  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new AppError('No product found with that ID', 404));
  }

  product.removeImage(imageUrl);
  await product.save();

  res.status(200).json({
    status: 'success',
    data: {
      product,
    },
  });
});

// Get my products (products created by the logged-in user)
exports.getMyProducts = catchAsync(async (req, res) => {
  const features = new APIFeatures(
    Product.find({ createdBy: req.user._id }),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const products = await features.query;

  res.status(200).json({
    status: 'success',
    results: products.length,
    data: {
      products,
    },
  });
});
