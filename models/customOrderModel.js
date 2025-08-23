const mongoose = require('mongoose');
const validator = require('validator');

const CustomOrderSchema = new mongoose.Schema(
  {
    // Company Information
    companyInfo: {
      companyName: {
        type: String,
        required: [true, 'Company name is required'],
        trim: true,
        maxlength: [100, 'Company name cannot exceed 100 characters'],
      },
      contactPerson: {
        type: String,
        required: [true, 'Contact person name is required'],
        trim: true,
        maxlength: [50, 'Contact person name cannot exceed 50 characters'],
      },
      email: {
        type: String,
        required: [true, 'Email address is required'],
        lowercase: true,
        validate: [validator.isEmail, 'Please provide a valid email address'],
      },
      phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
        validate: {
          validator: function (phone) {
            return /^[\+]?[0-9\s\-\(\)]+$/.test(phone);
          },
          message: 'Please provide a valid phone number',
        },
      },
    },

    // Order Details
    orderDetails: {
      employeeCount: {
        type: Number,
        required: [true, 'Number of employees/cards is required'],
        min: [10, 'Minimum order quantity is 10 cards'],
        max: [10000, 'Maximum order quantity is 10,000 cards'],
      },
      message: {
        type: String,
        trim: true,
        maxlength: [1000, 'Additional message cannot exceed 1000 characters'],
      },
    },

    // Order Management
    status: {
      type: String,
      enum: {
        values: [
          'pending', // Initial submission
          'reviewing', // Under review by admin
          'quoted', // Quote provided to customer
          'approved', // Customer approved quote
          'in_production', // Order in production
          'completed', // Order completed
          'cancelled', // Order cancelled
        ],
        message: 'Invalid custom order status',
      },
      default: 'pending',
    },

    // // Selected package for pricing (reference to Package model)
    selectedPackage: {
      type: mongoose.Schema.ObjectId,
      ref: 'Package',
    },

    // // Custom pricing (for 10-49 and 100+ tiers when admin sets custom price)
    // customPricing: {
    //   pricePerCard: {
    //     type: Number,
    //     min: [0, 'Price per card must be positive'],
    //   },
    //   totalPrice: {
    //     type: Number,
    //     min: [0, 'Total price must be positive'],
    //   },
    //   isCustom: {
    //     type: Boolean,
    //     default: false,
    //   },
    // },

    // // Timeline
    // estimatedDelivery: {
    //   type: Date,
    // },
    // quotedAt: {
    //   type: Date,
    // },
    // approvedAt: {
    //   type: Date,
    // },
    // completedAt: {
    //   type: Date,
    // },

    // // Admin Notes
    // adminNotes: {
    //   type: String,
    //   trim: true,
    //   maxlength: [2000, 'Admin notes cannot exceed 2000 characters'],
    // },

    // // Customer Response to Quote
    // customerResponse: {
    //   approved: {
    //     type: Boolean,
    //     default: false,
    //   },
    //   responseDate: {
    //     type: Date,
    //   },
    //   customerNotes: {
    //     type: String,
    //     trim: true,
    //     maxlength: [1000, 'Customer notes cannot exceed 1000 characters'],
    //   },
    // },

    // // Reference to user who created this request
    // createdBy: {
    //   type: mongoose.Schema.ObjectId,
    //   ref: 'User',
    // },

    // // Reference to admin who handled this request
    // handledBy: {
    //   type: mongoose.Schema.ObjectId,
    //   ref: 'User',
    // },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
CustomOrderSchema.index({ status: 1 });
CustomOrderSchema.index({ createdAt: -1 });
CustomOrderSchema.index({ 'companyInfo.email': 1 });
CustomOrderSchema.index({ createdBy: 1 });

// Virtual for formatted total price
// CustomOrderSchema.virtual('formattedTotalPrice').get(function () {
//   if (this.customPricing?.totalPrice) {
//     return `${this.customPricing.totalPrice} JOD`;
//   }
//   if (this.selectedPackage?.price) {
//     return `${
//       this.selectedPackage.price * this.orderDetails.employeeCount
//     } JOD`;
//   }
//   return 'Quote pending';
// });

// // Virtual for order age
// CustomOrderSchema.virtual('orderAge').get(function () {
//   if (this.createdAt) {
//     const now = new Date();
//     const diffTime = Math.abs(now - this.createdAt);
//     const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
//     return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
//   }
//   return null;
// });

// // Virtual for estimated savings (for bulk orders)
// CustomOrderSchema.virtual('estimatedSavings').get(function () {
//   if (
//     this.orderDetails.employeeCount >= 100 &&
//     this.customPricing?.totalPrice
//   ) {
//     // Compare with 50-99 tier pricing (assuming base price)
//     const basePrice = 15; // JOD per card for 50-99 tier
//     const standardTotal = basePrice * this.orderDetails.employeeCount;
//     const savings = standardTotal - this.customPricing.totalPrice;
//     return savings > 0 ? `${savings.toFixed(2)} JOD` : null;
//   }
//   return null;
// });

// // Instance method to update status with automatic date tracking
// CustomOrderSchema.methods.updateStatus = function (newStatus, userId = null) {
//   const validStatuses = [
//     'pending',
//     'reviewing',
//     'quoted',
//     'approved',
//     'in_production',
//     'completed',
//     'cancelled',
//   ];

//   if (!validStatuses.includes(newStatus)) {
//     throw new Error('Invalid status');
//   }

//   this.status = newStatus;

//   // Update relevant dates based on status
//   const now = new Date();
//   if (newStatus === 'quoted' && !this.quotedAt) {
//     this.quotedAt = now;
//   }
//   if (newStatus === 'approved' && !this.approvedAt) {
//     this.approvedAt = now;
//     this.customerResponse.approved = true;
//     this.customerResponse.responseDate = now;
//   }
//   if (newStatus === 'completed' && !this.completedAt) {
//     this.completedAt = now;
//   }
//   // if (newStatus === 'reviewing' && userId) {
//   //   this.handledBy = userId;
//   // }

//   return this;
// };

// // Instance method to set custom pricing
// CustomOrderSchema.methods.setCustomPricing = function (pricePerCard) {
//   this.customPricing = {
//     pricePerCard,
//     totalPrice: pricePerCard * this.orderDetails.employeeCount,
//     isCustom: true,
//   };
//   return this;
// };

// // Instance method to assign package
// CustomOrderSchema.methods.assignPackage = function (packageId) {
//   this.selectedPackage = packageId;
//   return this;
// };

// // Instance method to get order summary
// CustomOrderSchema.methods.getOrderSummary = function () {
//   return {
//     id: this._id,
//     companyName: this.companyInfo.companyName,
//     contactPerson: this.companyInfo.contactPerson,
//     email: this.companyInfo.email,
//     employeeCount: this.orderDetails.employeeCount,
//     status: this.status,
//     totalPrice: this.formattedTotalPrice,
//     estimatedDelivery: this.estimatedDelivery,
//     orderAge: this.orderAge,
//   };
// };

// // Static method to find orders by status
// CustomOrderSchema.statics.findByStatus = function (status) {
//   return this.find({ status })
//     .populate('createdBy', 'name email')
//     .populate('handledBy', 'name email')
//     .sort('-createdAt');
// };

// // Static method to get order statistics
// CustomOrderSchema.statics.getCustomOrderStats = function () {
//   return this.aggregate([
//     {
//       $group: {
//         _id: '$status',
//         count: { $sum: 1 },
//         totalCards: { $sum: '$orderDetails.employeeCount' },
//         totalRevenue: { $sum: '$pricing.totalPrice' },
//         avgOrderSize: { $avg: '$orderDetails.employeeCount' },
//       },
//     },
//     {
//       $sort: { count: -1 },
//     },
//   ]);
// };

// Pre-save middleware to set estimated delivery for new orders
// CustomOrderSchema.pre('save', function (next) {
//   if (this.isNew && !this.estimatedDelivery) {
//     // Estimate delivery: 7-14 days for custom orders (longer than regular orders)
//     const estimatedDays = 10; // 10 days average for custom orders
//     this.estimatedDelivery = new Date(
//       Date.now() + estimatedDays * 24 * 60 * 60 * 1000
//     );
//   }
//   next();
// });

// Add soft delete fields to the schema
CustomOrderSchema.add({
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
});

const CustomOrder = mongoose.model('CustomOrder', CustomOrderSchema);
module.exports = CustomOrder;
