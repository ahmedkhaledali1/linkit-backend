const fs = require('fs');
const express = require('express');
const app = express();
const morgan = require('morgan');
const {
  getAllUsers,
  createUser,
  getOneUser,
  updateUser,
  deleteUser,
} = require('../controllers/users.controllers');
const {
  signUp,
  login,
  protect,
  forgotPassword,
  resetPassword,
  updatePassword,
} = require('../controllers/authConroller');

const router = express.Router();

router.post('/signup', signUp);
router.post('/login', login);
router.post('/forgotPassword', forgotPassword);
router.patch('/resetPassword/:token', resetPassword);
router.patch('/updatePassword', protect, updatePassword);

router.route('/').get(getAllUsers).post(createUser);
router.route('/:id').get(getOneUser).delete(deleteUser);

module.exports = router;
