const Contact = require('../models/contactModel');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/apiError');

// Get all contacts
exports.getAllContacts = factory.getAll(Contact);

// Get single contact
exports.getOneContact = factory.getOne(Contact);

// Create contact
exports.createContact = factory.createOne(Contact);

// Update contact
exports.updateContact = factory.updateOne(Contact);

// Delete contact
exports.deleteContact = factory.deleteOne(Contact);
