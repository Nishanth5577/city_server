const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const validate = require('../middleware/validate');
const { uploadImage } = require('../middleware/upload');
const {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} = require('../validators/authValidator');
const {
  register,
  login,
  logout,
  refresh,
  getMe,
  updateProfile,
  forgotPassword,
  resetPassword,
  changePassword,
  getUsers,
  updateUser,
} = require('../controllers/authController');

router.post('/register', registerValidator, validate, register);
router.post('/login', loginValidator, validate, login);
router.post('/logout', auth, logout);
router.post('/refresh', refresh);
router.get('/me', auth, getMe);
router.put('/profile', auth, uploadImage.single('profile_image'), updateProfile);
router.put('/change-password', auth, changePassword);
router.post('/forgot-password', forgotPasswordValidator, validate, forgotPassword);
router.post('/reset-password/:token', resetPasswordValidator, validate, resetPassword);
router.get('/users', auth, authorize('admin'), getUsers);
router.put('/users/:id', auth, authorize('admin'), updateUser);

module.exports = router;
