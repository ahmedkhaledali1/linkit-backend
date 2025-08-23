const mongoose = require('mongoose');

const CountrySchema = new mongoose.Schema(
  {
    // Country name
    name: {
      type: String,
      required: [true, 'Country name is required'],
      trim: true,
      maxlength: [100, 'Country name cannot exceed 100 characters'],
    },

    // Country code (e.g., JO, UK, US)
    code: {
      type: String,
      required: [true, 'Country code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: [3, 'Country code cannot exceed 3 characters'],
      minlength: [2, 'Country code must be at least 2 characters'],
    },

    // Country status
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
CountrySchema.index({ name: 1 });
CountrySchema.index({ code: 1 });
CountrySchema.index({ isActive: 1 });
CountrySchema.index({ isDeleted: 1 });

// Virtual for cities (populated)
CountrySchema.virtual('cities', {
  ref: 'City',
  localField: '_id',
  foreignField: 'country',
  justOne: false,
});

// Virtual for cities count
CountrySchema.virtual('citiesCount', {
  ref: 'City',
  localField: '_id',
  foreignField: 'country',
  count: true,
});

// Static method to get all countries
CountrySchema.statics.getAllCountries = function () {
  return this.find({
    isActive: true,
    isDeleted: { $ne: true },
  }).sort('displayOrder');
};

// Static method to get country by name
CountrySchema.statics.getByName = function (name) {
  return this.findOne({
    name: { $regex: new RegExp(name, 'i') },
    isActive: true,
    isDeleted: { $ne: true },
  });
};

// Static method to get country by code
CountrySchema.statics.getByCode = function (code) {
  return this.findOne({
    code: code.toUpperCase(),
    isActive: true,
    isDeleted: { $ne: true },
  });
};

// Static method to get countries with cities count
CountrySchema.statics.getCountriesWithCitiesCount = function () {
  return this.aggregate([
    {
      $match: {
        isActive: true,
        isDeleted: { $ne: true },
      },
    },
    {
      $lookup: {
        from: 'cities',
        localField: '_id',
        foreignField: 'country',
        as: 'cities',
      },
    },
    {
      $addFields: {
        citiesCount: { $size: '$cities' },
      },
    },
    {
      $project: {
        cities: 0,
      },
    },
    {
      $sort: { displayOrder: 1 },
    },
  ]);
};

const Country = mongoose.model('Country', CountrySchema);
module.exports = Country;
