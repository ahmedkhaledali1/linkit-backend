const mongoose = require('mongoose');
const validator = require('validator');

const ProductSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a product title'],
      trim: true,
      maxlength: [100, 'Product title must be less than 100 characters'],
      minlength: [3, 'Product title must be at least 3 characters'],
    },
    description: {
      type: String,
      required: [true, 'Please provide a product description'],
      trim: true,
      maxlength: [
        1000,
        'Product description must be less than 1000 characters',
      ],
      minlength: [10, 'Product description must be at least 10 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Please provide a product price'],
      min: [0, 'Price must be a positive number'],
      validate: {
        validator: function (val) {
          return val >= 0;
        },
        message: 'Price must be a positive number',
      },
    },

    // colors: [
    //   {
    //     type: String,
    //     trim: true,
    //     lowercase: t rue,
    //     validate: {
    //       validator: function (color) {
    //         // Allow color names or hex codes
    //         const colorNameRegex = /^[a-zA-Z\s]+$/;
    //         const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    //         return colorNameRegex.test(color) || hexColorRegex.test(color);
    //       },
    //       message: 'Please provide a valid color name or hex code',
    //     },
    //   },
    // ],
    images: [
      {
        type: mongoose.Schema.Types.Mixed,
        required: [true, 'Please provide an image'],
      },
    ],
    isMainProduct: {
      type: Boolean,
      default: false,
    },
    cardDesigns: [
      {
        color: {
          type: String,

          required: [true, 'Card color is required'],
        },

        image: {
          type: mongoose.Schema.Types.Mixed,
        },
      },
    ],

    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Product must belong to a user'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    // Soft delete fields
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // This will automatically handle createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
ProductSchema.index({ title: 'text', description: 'text' });
ProductSchema.index({ price: 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ createdBy: 1 });
ProductSchema.index({ isDeleted: 1 });

// Static method to find products by price range
ProductSchema.statics.findByPriceRange = function (minPrice, maxPrice) {
  return this.find({
    price: { $gte: minPrice, $lte: maxPrice },
    isActive: true,
  });
};

const Product = mongoose.model('Product', ProductSchema);
module.exports = Product;
