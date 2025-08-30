const fs = require('fs');
const express = require('express');
const app = express();
const cors = require('cors');

app.use(
  cors({
    origin: true, // Allow all origins during development
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);
// Serve static files with proper CORS headers
app.use(
  '/uploads',
  (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Range'
    );
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader(
      'Access-Control-Expose-Headers',
      'Content-Range, X-Content-Range'
    );
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    next();
  },
  express.static('uploads', {
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
      res.setHeader('Cache-Control', 'public, max-age=31536000');
    },
  })
);

// Ensure uploads directory exists
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.set('trust proxy', 1);

const morgan = require('morgan');
const userRouter = require('./routes/user');
const productRouter = require('./routes/products');
const orderRouter = require('./routes/orders');
const customOrderRouter = require('./routes/customOrders');
const packageRouter = require('./routes/packages');
const testimonialsRouter = require('./routes/testimonials');
const contactRouter = require('./routes/contact');
const homeRouter = require('./routes/home');
const subscriberRouter = require('./routes/subscribers');
const socialMediaRouter = require('./routes/socialMedia');
const countryRouter = require('./routes/countries');
const cityRouter = require('./routes/cities');
const addonsRouter = require('./routes/addons');
const AppError = require('./utils/apiError');
const globalErrorHandler = require('./controllers/error.controller');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

// Middlewares
app.use(helmet());

// const limiter = rateLimit({
//   max: 100,
//   windowMs: 60 * 60 * 1000,
//   message: 'Too many requests, plz try again an hour!',
// });

// app.use('/api', limiter);

app.use(express.json());
// console.log(process.env);
app.use(mongoSanitize());

app.use(xss());
app.use(
  hpp({
    whitelist: ['duration'],
  })
);

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
app.use(express.static(`${__dirname}/public`));

app.use((req, res, next) => {
  // console.log('hello from the middleware');
  next();
});
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.headers);
  next();
});
// const router = express.Router();

// app.use('/api/v1/tours', tourRouter);
// app.use('/api/v1/reviews', reviewsRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/products', productRouter);
app.use('/api/v1/orders', orderRouter);
app.use('/api/v1/custom-orders', customOrderRouter);
app.use('/api/v1/packages', packageRouter);
app.use('/api/v1/testimonials', testimonialsRouter);
app.use('/api/v1/contact', contactRouter);
app.use('/api/v1/home', homeRouter);
app.use('/api/v1/subscribers', subscriberRouter);
app.use('/api/v1/social-media', socialMediaRouter);
app.use('/api/v1/countries', countryRouter);
app.use('/api/v1/cities', cityRouter);
app.use('/api/v1/addons', addonsRouter);

app.all('*', (req, res, next) => {
  // res.status(404).json({
  //   status: 'faild',
  //   messages: `Can not find ${req.originalUrl}`,
  // });

  // const err = new Error(`Can not find ${req.originalUrl}`);
  // err.status = 'fail';
  // err.statusCode = 404;

  next(new AppError(`Can not find ${req.originalUrl} on the server`, 404));
});
// Multer error handler

app.use(globalErrorHandler);
module.exports = app;
