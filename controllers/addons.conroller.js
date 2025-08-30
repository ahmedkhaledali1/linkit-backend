const AddonModel = require('../models/AddonModel');
const catchAsync = require('../utils/catchAsync');
const {
  getAll,
  hardDeleteOne,
  getOne,
  updateOne,
} = require('./handlerFactory');
const { getRelativeFilePath } = require('../utils/fileUpload');

exports.createAddon = catchAsync(async (req, res) => {
  const doc = await AddonModel.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      data: doc,
    },
  });
});

exports.updateAddon = updateOne(AddonModel);

exports.getAddons = getAll(AddonModel);

exports.getAddon = getOne(AddonModel);

exports.deleteAddon = hardDeleteOne(AddonModel);
