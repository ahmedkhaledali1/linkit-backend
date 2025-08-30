const mongoose = require('mongoose');
const validator = require('validator');

const OrderSchema = new mongoose.Schema(
  {
    // customer: {
    //   type: mongoose.Schema.ObjectId,
    //   ref: 'User',
    //   required: [true, 'Order must belong to a customer'],
    // },
    product: {
      type: mongoose.Schema.ObjectId,
      ref: 'Product',
      required: [true, 'Order must reference a product'],
    },

    // Personal Information (Step 1)
    personalInfo: {
      firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters'],
      },
      lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        maxlength: [50, 'Last name cannot exceed 50 characters'],
      },
      position: {
        type: String,
        required: [true, 'Position is required'],
        trim: true,
        maxlength: [100, 'Position cannot exceed 100 characters'],
      },
      organization: {
        type: String,
        required: [true, 'Organization is required'],
        trim: true,
        maxlength: [100, 'Organization cannot exceed 100 characters'],
      },
      phoneNumbers: [
        {
          type: String,
          required: true,
          trim: true,
          validate: {
            validator: function (phone) {
              return /^[\+]?[0-9\s\-\(\)]+$/.test(phone);
            },
            message: 'Please provide a valid phone number',
          },
        },
      ],
      email: {
        type: String,
        required: [true, 'Email is required'],
        validate: [validator.isEmail, 'Please provide a valid email'],
      },
      businessEmail: {
        type: String,
      },
      linkedinUrl: {
        type: String,
        trim: true,
      },
      instagramUrl: {
        type: String,
        trim: true,
      },
    },

    // Card Design (Step 2)
    cardDesign: {
      nameOnCard: {
        type: String,
        required: [true, 'Name on card is required'],
        trim: true,
        maxlength: [100, 'Name on card cannot exceed 100 characters'],
      },
      color: {
        type: String,

        required: [true, 'Card color is required'],
      },
      includePrintedLogo: {
        type: Boolean,
        default: false,
      },
      companyLogo: {
        type: String, // File path to uploaded logo
      },
    },

    addons: [
      {
        addon: {
          type: mongoose.Schema.ObjectId,
          ref: 'Addon',
        },
        addonValue: {
          type: String,
        },
      },
    ],
    addonImages: [
      {
        type: String,
      },
    ],

    // Delivery Information (Step 3)
    deliveryInfo: {
      country: {
        type: mongoose.Schema.ObjectId,
        ref: 'Country',
        required: [true, 'Country reference is required'],
      },
      city: {
        type: mongoose.Schema.ObjectId,
        ref: 'City',
        required: [true, 'City reference is required'],
      },
      addressLine1: {
        type: String,
        required: [true, 'Address line 1 is required'],
        trim: true,
        maxlength: [200, 'Address line 1 cannot exceed 200 characters'],
      },
      addressLine2: {
        type: String,
        trim: true,
        maxlength: [200, 'Address line 2 cannot exceed 200 characters'],
      },
      useSameContact: {
        type: Boolean,
        default: true,
      },
      deliveryPhone: {
        type: String,
        required: [true, 'Delivery phone is required'],
        trim: true,
        validate: {
          validator: function (phone) {
            return /^[\+]?[0-9\s\-\(\)]+$/.test(phone);
          },
          message: 'Please provide a valid delivery phone number',
        },
      },
      deliveryEmail: {
        type: String,
        required: [true, 'Delivery email is required'],
        lowercase: true,
        validate: [validator.isEmail, 'Please provide a valid delivery email'],
      },
      postcode: {
        type: String,
        trim: true,
      },
    },

    // Payment Method (Step 4)
    paymentMethod: {
      type: String,
      enum: {
        values: ['cash', 'online'],
        message: 'Payment method must be either cash or online',
      },
      default: 'cash',
      required: [true, 'Payment method is required'],
    },
    despositeTransactionImg: {
      type: String, // File path to uploaded transaction image
    },

    // Order Details
    status: {
      type: String,
      enum: {
        values: [
          'pending',
          'confirmed',
          'processing',
          'printed',
          'shipped',
          'delivered',
          'cancelled',
          'refunded',
        ],
      },
      default: 'pending',
    },

    total: {
      type: Number,
      required: [true, 'Order total is required'],
      min: [0, 'Order total must be positive'],
    },
    finalTotal: {
      type: Number,
      required: [true, 'Order total is required'],
      min: [0, 'Order total must be positive'],
    },
    // currency: {
    //   type: String,
    //   default: 'JOD',
    //   enum: ['JOD', 'USD', 'EUR'],
    // },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
// OrderSchema.index({ orderId: 1 });
OrderSchema.index({ customer: 1 });
OrderSchema.index({ product: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ orderDate: -1 });
OrderSchema.index({ createdBy: 1 });
OrderSchema.index({ 'personalInfo.email': 1 });
OrderSchema.index({ 'deliveryInfo.country': 1 });

// Virtual for formatted total
OrderSchema.virtual('formattedTotal').get(function () {
  return `${this.total} ${this.currency}`;
});

// Virtual for full customer name
OrderSchema.virtual('customerFullName').get(function () {
  if (this.personalInfo) {
    return `${this.personalInfo.firstName} ${this.personalInfo.lastName}`;
  }
  return null;
});

// Virtual for full address
OrderSchema.virtual('fullAddress').get(function () {
  if (this.deliveryInfo) {
    const { addressLine1, addressLine2, city, country } = this.deliveryInfo;
    const countryName = country === 'JO' ? 'Jordan' : 'United Kingdom';
    return `${addressLine1}${
      addressLine2 ? ', ' + addressLine2 : ''
    }, ${city}, ${countryName}`;
  }
  return null;
});

// Virtual for order duration
OrderSchema.virtual('orderAge').get(function () {
  if (this.orderDate) {
    const now = new Date();
    const diffTime = Math.abs(now - this.orderDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }
  return null;
});

// Pre-save middleware to generate order ID
// OrderSchema.pre('save', async function (next) {
//   if (this.isNew && !this.orderId) {
//     // Generate unique order ID for NFC cards
//     const timestamp = Date.now().toString();
//     const random = Math.floor(Math.random() * 1000)
//       .toString()
//       .padStart(3, '0');
//     this.orderId = `NFC-${timestamp}-${random}`;
//   }
//   next();
// });

// Pre-save middleware to set delivery contact info
OrderSchema.pre('save', function (next) {
  if (
    this.deliveryInfo &&
    this.deliveryInfo.useSameContact &&
    this.personalInfo
  ) {
    this.deliveryInfo.deliveryPhone = this.personalInfo.phoneNumbers[0] || '';
    this.deliveryInfo.deliveryEmail = this.personalInfo.email;
  }
  next();
});

// Pre-save middleware to set estimated delivery
OrderSchema.pre('save', function (next) {
  if (this.isNew) {
    // Estimate delivery: 2-4 days from order date
    const estimatedDays = this.deliveryInfo?.country === 'JO' ? 3 : 5; // Jordan faster than UK
    this.estimatedDelivery = new Date(
      Date.now() + estimatedDays * 24 * 60 * 60 * 1000
    );
  }
  next();
});

// Instance method to update status with automatic date tracking
OrderSchema.methods.updateStatus = function (newStatus) {
  const validStatuses = [
    'pending',
    'confirmed',
    'processing',
    'printed',
    'shipped',
    'delivered',
    'cancelled',
    'refunded',
  ];

  if (!validStatuses.includes(newStatus)) {
    throw new Error('Invalid status');
  }

  this.status = newStatus;

  // Update relevant dates based on status
  const now = new Date();
  if (newStatus === 'printed' && !this.printingDate) {
    this.printingDate = now;
  }
  if (newStatus === 'shipped' && !this.shippingDate) {
    this.shippingDate = now;
  }
  if (newStatus === 'delivered' && !this.deliveryDate) {
    this.deliveryDate = now;
  }

  return this;
};

// Instance method to get order summary for confirmation
OrderSchema.methods.getOrderSummary = function () {
  return {
    id: this._id,
    customerName: this.customerFullName,
    cardColor: this.cardDesign?.color,
    includeLogo: this.cardDesign?.includePrintedLogo,
    total: this.formattedTotal,
    deliveryAddress: this.fullAddress,
    estimatedDelivery: this.estimatedDelivery,
    status: this.status,
  };
};

// Static method to find orders by status
OrderSchema.statics.findByStatus = function (status) {
  return this.find({ status })
    .populate('customer', 'name email')
    .sort('-orderDate');
};

// Static method to find orders by customer
OrderSchema.statics.findByCustomer = function (customerId) {
  return this.find({ customer: customerId })
    .populate('customer', 'name email')
    .sort('-orderDate');
};

// Static method to get order statistics
OrderSchema.statics.getOrderStats = function () {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$total' },
        avgOrderValue: { $avg: '$total' },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);
};

// Static method to get orders by country
OrderSchema.statics.findByCountry = function (country) {
  return this.find({ 'deliveryInfo.country': country })
    .populate('customer', 'name email')
    .sort('-orderDate');
};

// Add soft delete fields to the schema
OrderSchema.add({
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
});

const Order = mongoose.model('Order', OrderSchema);
module.exports = Order;
