const mongoose = require('mongoose');

const PackageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Package name is required'],
      trim: true,
      unique: true,
    },

    // Quantity range for this package
    quantityRange: {
      min: {
        type: Number,
        required: [true, 'Minimum quantity is required'],
        min: [1, 'Minimum quantity must be at least 1'],
      },
      max: {
        type: Number,
        required: [true, 'Maximum quantity is required'],
        validate: {
          validator: function (max) {
            return max >= this.quantityRange.min;
          },
          message:
            'Maximum quantity must be greater than or equal to minimum quantity',
        },
      },
    },

    // Pricing information
    pricing: {
      pricePerCard: {
        type: Number,
        required: [true, 'Price per card is required'],
        min: [0, 'Price per card must be positive'],
      },
      currency: {
        type: String,
        default: 'JOD',
        enum: ['JOD', 'USD', 'EUR'],
      },
      isFixedPrice: {
        type: Boolean,
        default: false, // true for 50-99 tier, false for custom pricing tiers
      },
    },

    // Package features
    features: [
      {
        type: String,
        trim: true,
      },
    ],

    // Package description
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },

    // Package status
    isActive: {
      type: Boolean,
      default: true,
    },

    // Delivery information
    deliveryInfo: {
      estimatedDays: {
        type: Number,
        default: 10,
        min: [1, 'Estimated delivery days must be at least 1'],
      },
      freeDelivery: {
        type: Boolean,
        default: true,
      },
    },

    // Package type (to distinguish pricing tiers)
    packageType: {
      type: String,
      enum: {
        values: ['starter', 'standard', 'enterprise'],
        message: 'Package type must be starter, standard, or enterprise',
      },
      required: [true, 'Package type is required'],
    },

    // Display order for frontend
    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
PackageSchema.index({ 'quantityRange.min': 1, 'quantityRange.max': 1 });
PackageSchema.index({ packageType: 1 });
PackageSchema.index({ isActive: 1 });
PackageSchema.index({ displayOrder: 1 });

// Virtual for quantity range display
PackageSchema.virtual('quantityDisplay').get(function () {
  if (this.quantityRange.max === 999999) {
    return `${this.quantityRange.min}+`;
  }
  return `${this.quantityRange.min}-${this.quantityRange.max}`;
});

// Virtual for formatted price
PackageSchema.virtual('formattedPrice').get(function () {
  return `${this.pricing.pricePerCard} ${this.pricing.currency}`;
});

// Static method to find package by quantity
PackageSchema.statics.findByQuantity = function (quantity) {
  return this.findOne({
    'quantityRange.min': { $lte: quantity },
    'quantityRange.max': { $gte: quantity },
    isActive: true,
  });
};

// Static method to get all active packages
PackageSchema.statics.getActivePackages = function () {
  return this.find({ isActive: true }).sort('displayOrder');
};

// Static method to get packages by type
PackageSchema.statics.getByType = function (packageType) {
  return this.find({ packageType, isActive: true }).sort('displayOrder');
};

// Pre-save middleware to ensure no overlapping quantity ranges
PackageSchema.pre('save', async function (next) {
  if (this.isModified('quantityRange')) {
    const overlapping = await this.constructor.findOne({
      _id: { $ne: this._id },
      $or: [
        {
          'quantityRange.min': {
            $lte: this.quantityRange.max,
            $gte: this.quantityRange.min,
          },
        },
        {
          'quantityRange.max': {
            $lte: this.quantityRange.max,
            $gte: this.quantityRange.min,
          },
        },
        {
          'quantityRange.min': { $lte: this.quantityRange.min },
          'quantityRange.max': { $gte: this.quantityRange.max },
        },
      ],
    });

    if (overlapping) {
      const error = new Error(
        `Quantity range overlaps with existing package: ${overlapping.name}`
      );
      return next(error);
    }
  }
  next();
});

// Add soft delete fields to the schema
PackageSchema.add({
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
});

const Package = mongoose.model('Package', PackageSchema);
module.exports = Package;
