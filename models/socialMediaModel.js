const mongoose = require('mongoose');
const validator = require('validator');

const SocialMediaSchema = new mongoose.Schema(
  {
    // Platform names
    platform: {
      type: String,
      required: [true, 'Platform name is required'],
      enum: {
        values: ['instagram', 'facebook', 'linkedin', 'whatsapp'],
        message: 'Platform must be instagram, facebook, linkedin, or whatsapp',
      },
    },

    // Social media URLs
    url: {
      type: String,
      required: [true, 'Social media URL is required'],
      trim: true,
      validate: {
        validator: function (url) {
          if (!url) return false;
          return validator.isURL(url);
        },
        message: 'Please provide a valid social media URL',
      },
    },

    // Display name (optional)
    displayName: {
      type: String,
      trim: true,
      maxlength: [100, 'Display name cannot exceed 100 characters'],
    },

    // Username/handle (optional)
    username: {
      type: String,
      trim: true,
      maxlength: [50, 'Username cannot exceed 50 characters'],
    },

    // Description (optional)
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },

    // Platform-specific data
    platformData: {
      // Instagram specific
      instagram: {
        followers: {
          type: Number,
          min: [0, 'Followers count cannot be negative'],
        },
        posts: {
          type: Number,
          min: [0, 'Posts count cannot be negative'],
        },
        verified: {
          type: Boolean,
          default: false,
        },
      },

      // Facebook specific
      facebook: {
        likes: {
          type: Number,
          min: [0, 'Likes count cannot be negative'],
        },
        followers: {
          type: Number,
          min: [0, 'Followers count cannot be negative'],
        },
        verified: {
          type: Boolean,
          default: false,
        },
      },

      // LinkedIn specific
      linkedin: {
        connections: {
          type: Number,
          min: [0, 'Connections count cannot be negative'],
        },
        followers: {
          type: Number,
          min: [0, 'Followers count cannot be negative'],
        },
        company: {
          type: String,
          trim: true,
        },
      },

      // WhatsApp specific
      whatsapp: {
        phoneNumber: {
          type: String,
          trim: true,
          validate: {
            validator: function (phone) {
              if (!phone) return true; // Optional field
              return /^\+?[1-9]\d{1,14}$/.test(phone);
            },
            message: 'Please provide a valid phone number',
          },
        },
        businessHours: {
          type: String,
          trim: true,
        },
        autoReply: {
          type: String,
          trim: true,
          maxlength: [200, 'Auto reply cannot exceed 200 characters'],
        },
      },
    },

    // Status
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
SocialMediaSchema.index({ platform: 1 });
SocialMediaSchema.index({ isActive: 1 });
SocialMediaSchema.index({ displayOrder: 1 });
SocialMediaSchema.index({ isDeleted: 1 });

// Virtual for formatted platform name
SocialMediaSchema.virtual('platformDisplayName').get(function () {
  const platformNames = {
    instagram: 'Instagram',
    facebook: 'Facebook',
    linkedin: 'LinkedIn',
    whatsapp: 'WhatsApp',
  };
  return platformNames[this.platform] || this.platform;
});

// Virtual for platform icon (for frontend)
SocialMediaSchema.virtual('platformIcon').get(function () {
  const platformIcons = {
    instagram: 'instagram',
    facebook: 'facebook',
    linkedin: 'linkedin',
    whatsapp: 'whatsapp',
  };
  return platformIcons[this.platform] || 'link';
});

// Static method to get active social media links
SocialMediaSchema.statics.getActiveSocialMedia = function () {
  return this.find({
    isActive: true,
    isDeleted: { $ne: true },
  }).sort('displayOrder');
};

// Static method to get social media by platform
SocialMediaSchema.statics.getByPlatform = function (platform) {
  return this.findOne({
    platform,
    isActive: true,
    isDeleted: { $ne: true },
  });
};

// Static method to get all platforms
SocialMediaSchema.statics.getAllPlatforms = function () {
  return this.find({
    isDeleted: { $ne: true },
  }).sort('displayOrder');
};

// Pre-save middleware to validate platform-specific data
SocialMediaSchema.pre('save', function (next) {
  // Validate platform-specific required fields
  if (
    this.platform === 'whatsapp' &&
    !this.platformData?.whatsapp?.phoneNumber
  ) {
    // For WhatsApp, either URL or phone number should be provided
    if (!this.url.includes('wa.me') && !this.url.includes('whatsapp.com')) {
      return next(
        new Error(
          'WhatsApp requires either a valid WhatsApp URL or phone number'
        )
      );
    }
  }
  next();
});

const SocialMedia = mongoose.model('SocialMedia', SocialMediaSchema);
module.exports = SocialMedia;
