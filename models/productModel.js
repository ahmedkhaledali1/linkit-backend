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

    colors: [
      {
        type: String,
        trim: true,
        lowercase: true,
        validate: {
          validator: function (color) {
            // Allow color names or hex codes
            const colorNameRegex = /^[a-zA-Z\s]+$/;
            const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
            return colorNameRegex.test(color) || hexColorRegex.test(color);
          },
          message: 'Please provide a valid color name or hex code',
        },
      },
    ],
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
    // category: {
    //   type: String,
    //   trim: true,
    //   maxlength: [50, 'Category must be less than 50 characters'],
    // },
    // brand: {
    //   type: String,
    //   trim: true,
    //   maxlength: [50, 'Brand must be less than 50 characters'],
    // },
    // inStock: {
    //   type: Boolean,
    //   default: true,
    // },
    // stockQuantity: {
    //   type: Number,
    //   default: 0,
    //   min: [0, 'Stock quantity cannot be negative'],
    // },
    // isActive: {
    //   type: Boolean,
    //   default: true,
    // },
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
ProductSchema.index({ isActive: 1 });

// Virtual for formatted price
// ProductSchema.virtual('formattedPrice').get(function () {
//   return `${this.price} ${this.currency}`;
// });

// Pre-save middleware to update the updatedAt field
ProductSchema.pre('save', function (next) {
  if (!this.isNew) {
    this.updatedAt = Date.now();
  }
  next();
});

// Pre-save middleware to ensure at least one image
ProductSchema.pre('save', function (next) {
  if (this.images.length === 0) {
    this.images.push('/img/products/default-product.jpg');
  }
  next();
});

// Instance method to add color
ProductSchema.methods.addColor = function (color) {
  if (!this.colors.includes(color.toLowerCase())) {
    this.colors.push(color.toLowerCase());
  }
  return this.colors;
};

// Instance method to remove color
ProductSchema.methods.removeColor = function (color) {
  this.colors = this.colors.filter((c) => c !== color.toLowerCase());
  return this.colors;
};

// Instance method to add image
ProductSchema.methods.addImage = function (imageUrl) {
  if (!this.images.includes(imageUrl)) {
    this.images.push(imageUrl);
  }
  return this.images;
};

// Instance method to remove image
ProductSchema.methods.removeImage = function (imageUrl) {
  this.images = this.images.filter((img) => img !== imageUrl);
  return this.images;
};

// Static method to find products by price range
ProductSchema.statics.findByPriceRange = function (minPrice, maxPrice) {
  return this.find({
    price: { $gte: minPrice, $lte: maxPrice },
    isActive: true,
  });
};

// Static method to find products by category
ProductSchema.statics.findByCategory = function (category) {
  return this.find({
    category: new RegExp(category, 'i'),
    isActive: true,
  });
};

const Product = mongoose.model('Product', ProductSchema);
module.exports = Product;
