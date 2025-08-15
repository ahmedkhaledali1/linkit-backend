const mongoose = require('mongoose');
const dotenv = require('dotenv');

process.on('uncaughtException', (err) => {
  console.log(err.name, err.message);
  // console.log('err...', err);
  console.log('UNHANDLED EXCEPTION. SHUTING DOWN.....');
  process.exit(1);
});

const app = require('./app');
dotenv.config({ path: './config.env' });

const DB = process.env.DB_CONNECTION;
const DB_LOCAL = process.env.DB_LOCAL;
// .replace(
//   '<PASSWORD>',
//   encodeURIComponent(process.env.DATABASE_PASSWORD)
// );

mongoose.connect(process.env.DB_CONNECTION, {}).then((con) => {
  // console.log(con);
  console.log('connections is done');
});

const port = process.env.PORT || 3000;
const sever = app.listen(port, () => {
  console.log(`app running on port ${port}....`);
});

process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log('err...', err.message);
  console.log('UNHANDLED REJECTION. SHUTING DOWN.....');
  sever.close(() => {
    process.exit(1);
  });
});
