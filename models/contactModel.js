const mongoose = require('mongoose');
const validator = require('validator');

const ContactSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Please provide your full name'],
      trim: true,
      maxlength: [100, 'Full name cannot exceed 100 characters'],
      minlength: [3, 'Full name must be at least 3 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide your email'],
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function (phone) {
          if (!phone) return true; // Optional field
          return /^[\+]?[0-9\s\-\(\)]+$/.test(phone);
        },
        message: 'Please provide a valid phone number',
      },
    },
    subject: {
      type: String,
      required: [true, 'Please provide a subject'],
      trim: true,
      maxlength: [200, 'Subject cannot exceed 200 characters'],
      minlength: [3, 'Subject must be at least 3 characters'],
    },
    message: {
      type: String,
      required: [true, 'Please provide your message'],
      trim: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
      minlength: [10, 'Message must be at least 10 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['New', 'In Progress', 'Responded', 'Closed'],
        message:
          'Status must be either: New, In Progress, Responded, or Closed',
      },
      default: 'New',
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for formatted date
ContactSchema.virtual('formattedDate').get(function () {
  return this.date.toISOString().split('T')[0];
});

// Virtual for formatted time
ContactSchema.virtual('formattedTime').get(function () {
  return new Date(this.date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
});

// Indexes for better query performance
ContactSchema.index({ status: 1 });
ContactSchema.index({ date: -1 });
ContactSchema.index({ email: 1 });

// Add soft delete fields to the schema
ContactSchema.add({
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
});

const Contact = mongoose.model('Contact', ContactSchema);
module.exports = Contact;
