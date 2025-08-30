const AppError = require('../utils/apiError');
const catchAsync = require('../utils/catchAsync');
const APIFeatures = require('../utils/apiFeatures');

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedAt: new Date(),
      },
      { new: true, runValidators: true }
    );

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      message: 'Document soft deleted successfully',
      data: null,
    });
  });

exports.getOne = (Model, populateOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true },
    });
    if (populateOptions) query = query.populate(populateOptions);
    const doc = await query;
    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }
    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.getAll = (Model, populateOptions) =>
  catchAsync(async (req, res, next) => {
    // Add soft delete filter to exclude deleted documents
    const softDeleteFilter = { isDeleted: { $ne: true } };

    const features = req?.query?.disablePagination
      ? new APIFeatures(Model.find(softDeleteFilter), req.query)
          .filter()
          .sort()
          .limitFields()
      : new APIFeatures(Model.find(softDeleteFilter), req.query)
          .filter()
          .sort()
          .limitFields()
          .paginate();

    let query = features.query;
    if (populateOptions) query = query.populate(populateOptions);

    const docs = await query;

    // console.log('docs..', docs);

    const disablePagination =
      req.query.disablePgination === 'true' ||
      req.query.disablePgination === true;

    if (disablePagination) {
      return res.status(200).json({
        status: 'success',
        results: docs.length,
        data: { data: docs },
      });
    }

    // Pagination calculation with soft delete filter
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const totalDocs = await Model.countDocuments({
      ...features.filterQuery,
      ...softDeleteFilter,
    });
    const totalPages = Math.ceil(totalDocs / limit);

    res.status(200).json({
      status: 'success',
      results: docs.length,
      data: {
        data: docs,
        pagination: {
          totalItems: totalDocs,
          totalPages,
          currentPage: page,
          itemsPerPage: limit,
        },
      },
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findOneAndUpdate(
      {
        _id: req.params.id,
        isDeleted: { $ne: true },
      },
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

// Additional soft delete utility methods
exports.restoreOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: false,
        deletedAt: null,
      },
      { new: true, runValidators: true }
    );

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      message: 'Document restored successfully',
      data: {
        data: doc,
      },
    });
  });

exports.hardDeleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(204).json({
      status: 'success',
      message: 'Document permanently deleted',
      data: null,
    });
  });

exports.getDeleted = (Model, populateOptions) =>
  catchAsync(async (req, res, next) => {
    const features = new APIFeatures(Model.find({ isDeleted: true }), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    let query = features.query;
    if (populateOptions) query = query.populate(populateOptions);

    const docs = await query;

    // Pagination calculation
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const totalDocs = await Model.countDocuments({
      ...features.filterQuery,
      isDeleted: true,
    });
    const totalPages = Math.ceil(totalDocs / limit);

    res.status(200).json({
      status: 'success',
      results: docs.length,
      data: {
        data: docs,
        pagination: {
          totalItems: totalDocs,
          totalPages,
          currentPage: page,
          itemsPerPage: limit,
        },
      },
    });
  });
