const fs = require('fs');
const express = require('express');
const app = express();
const morgan = require('morgan');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');

exports.getAllUsers = catchAsync(async (req, res) => {
  // console.log(req.requestTime);
  const users = await User.find();
  res.status(200).json({
    status: 'success',
    users,
  });
});
exports.getOneUser = (req, res) => {
  // console.log(req.requestTime);
  res.status(500).json({
    status: 'error',
    message: 'comming soon',
  });
};
exports.createUser = (req, res) => {
  // console.log(req.requestTime);
  res.status(500).json({
    status: 'error',
    message: 'comming soon',
  });
};

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword.',
        400
      )
    );
  }

  // 2) Filtered out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'name', 'email');
  if (req.file) filteredBody.photo = req.file.filename;

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.updateUser = (req, res) => {
  // console.log(req.requestTime);
  res.status(500).json({
    status: 'error',
    message: 'comming soon',
  });
};

exports.deleteUser = (req, res) => {
  // console.log(req.requestTime);
  res.status(500).json({
    status: 'error',
    message: 'comming soon',
  });
};
