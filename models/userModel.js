const mongoose = require('mongoose');
const validator = require('validator');
const bycript = require('bcryptjs');
const crypto = require('crypto');
const UserShcema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'please tell us your name'],
    trim: true,
    // maxlength: [true, "name characters "]
  },
  email: {
    type: String,
    required: [true, 'please provie your mail'],
    unique: true,
    lowerCase: true,
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  phote: { type: String },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'please provide a password'],
    minlength: [8, 'password should be more than 7 characters'],
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'please provide a confirm password'],
    validate: {
      // THIS ONLY WORKS ON CREATE AND SAVE SO WE CAN NOT USE IT IN FINDBYIDANDUPDATE!!!
      validator: function (el) {
        return el === this.password;
      },
      message: 'password confirm is not equal password!',
    },
  },
  changedPasswordAt: { type: Date },
  passwordResetToken: String,
  passwordResetExpires: Date,
});

UserShcema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  this.password = await bycript.hash(this.password, 12);
  this.passwordConfirm = undefined;

  next();
});
UserShcema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bycript.compare(candidatePassword, userPassword);
};

UserShcema.methods.changedPassword = function (JWTTimeStamp) {
  if (this.changedPasswordAt) {
    const changedPasswordAt = parseInt(
      this.changedPasswordAt.getTime() / 1000,
      10
    );
    return changedPasswordAt > JWTTimeStamp;
  }
  return false;
};

UserShcema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('shake256')
    .update(resetToken)
    .digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  console.log('resetToken...', resetToken);
  console.log('passwordResetToken...', this.passwordResetToken);
  return resetToken;
};

// Add soft delete fields to the schema
UserShcema.add({
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
});

const User = mongoose.model('User', UserShcema);
module.exports = User;
