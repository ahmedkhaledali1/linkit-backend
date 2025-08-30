const mongoose = require('mongoose');

const AddonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Addon must have a title'],
  },
  price: {
    type: Number,
    required: [true, 'Addon must have a price'],
  },
  options: {
    type: Array,
  },
  inputType: {
    type: String,
    enum: ['text', 'number', 'radio', 'select', 'image'],
  },
});

module.exports = mongoose.model('Addon', AddonSchema);
