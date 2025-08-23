const mongoose = require('mongoose');

const CitySchema = new mongoose.Schema(
  {
    // City name
    name: {
      type: String,
      required: [true, 'City name is required'],
      trim: true,
      maxlength: [100, 'City name cannot exceed 100 characters'],
    },

    // Reference to Country
    country: {
      type: mongoose.Schema.ObjectId,
      ref: 'Country',
      required: [true, 'Country reference is required'],
    },

    // Delivery fee for this city
    deliveryFee: {
      type: Number,
      required: [true, 'Delivery fee is required'],
      min: [0, 'Delivery fee cannot be negative'],
      default: 0,
    },

    // City status
    isActive: {
      type: Boolean,
      default: true,
    },

    // Display order for frontend
    displayOrder: {
      type: Number,
      default: 0,
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
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
CitySchema.index({ name: 1 });
CitySchema.index({ country: 1 });
CitySchema.index({ isActive: 1 });
CitySchema.index({ isDeleted: 1 });

// Virtual for formatted delivery fee
CitySchema.virtual('deliveryFeeFormatted').get(function () {
  return `$${this.deliveryFee}`;
});

// Static method to get active cities
CitySchema.statics.getActiveCities = function () {
  return this.find({
    isActive: true,
    isDeleted: { $ne: true },
  })
    .populate('country', 'name')
    .sort('displayOrder');
};

// Static method to get cities by country
CitySchema.statics.getCitiesByCountry = function (countryId) {
  return this.find({
    country: countryId,
    isActive: true,
    isDeleted: { $ne: true },
  })
    .populate('country', 'name')
    .sort('displayOrder');
};

// Static method to get city by name
CitySchema.statics.getByName = function (name) {
  return this.findOne({
    name: { $regex: new RegExp(name, 'i') },
    isActive: true,
    isDeleted: { $ne: true },
  }).populate('country', 'name');
};

// Static method to get delivery fee for a specific city
CitySchema.statics.getDeliveryFee = function (cityId) {
  return this.findById(cityId)
    .select('deliveryFee name')
    .populate('country', 'name');
};

// Pre-save middleware to ensure unique city names per country
CitySchema.pre('save', async function (next) {
  if (this.isModified('name') || this.isModified('country')) {
    const existingCity = await this.constructor.findOne({
      name: { $regex: new RegExp(`^${this.name}$`, 'i') },
      country: this.country,
      _id: { $ne: this._id },
      isDeleted: { $ne: true },
    });

    if (existingCity) {
      return next(
        new Error(`City '${this.name}' already exists in this country`)
      );
    }
  }
  next();
});

const City = mongoose.model('City', CitySchema);
module.exports = City;
