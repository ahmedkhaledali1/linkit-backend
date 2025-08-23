const mongoose = require('mongoose');
const validator = require('validator');

const SubscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, 'Please provide a valid email'],
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
SubscriberSchema.index({ email: 1 });
SubscriberSchema.index({ isDeleted: 1 });
SubscriberSchema.index({ createdAt: -1 });

// Static method to check if email is already subscribed
SubscriberSchema.statics.isEmailSubscribed = function (email) {
  return this.findOne({
    email: email.toLowerCase(),
    isDeleted: { $ne: true },
  });
};

// Static method to get subscriber count
SubscriberSchema.statics.getSubscriberCount = function () {
  return this.countDocuments({ isDeleted: { $ne: true } });
};

// Static method to get recent subscribers
SubscriberSchema.statics.getRecentSubscribers = function (limit = 10) {
  return this.find({ isDeleted: { $ne: true } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('email createdAt');
};

const Subscriber = mongoose.model('Subscriber', SubscriberSchema);
module.exports = Subscriber;
