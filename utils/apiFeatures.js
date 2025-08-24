class APIFeatures {
  constructor(query, queryStr) {
    this.query = query;
    this.queryStr = queryStr;
  }

  filter() {
    const queryObj = { ...this.queryStr };
    const excluded = ['page', 'sort', 'limit', 'fields', 'disablePagination'];
    excluded.forEach((k) => delete queryObj[k]);

    let str = JSON.stringify(queryObj);
    str = str.replace(/\b(gte|gt|lte|lt)\b/g, (m) => `$${m}`);

    this.filterQuery = JSON.parse(str);
    this.query = this.query.find(this.filterQuery);
    return this;
  }
  sort() {
    if (this.queryStr.sort) {
      const sortBy = this.queryStr.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }
  limitFields() {
    if (this.queryStr.fields) {
      const fields = this.queryStr.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }
  paginate() {
    const page = this.queryStr.page * 1 || 1;
    const limit = this.queryStr.limit * 1 || 10;
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);
    return this;

    // if (this.queryStr.page) {
    //   const tourNum = await Tour.countDocuments();
    //   if (skip >= tourNum) throw new Error('this page is not found');
    // }
  }
}
module.exports = APIFeatures;
