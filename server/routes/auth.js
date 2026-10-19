const router = require('express').Router();
const { login, getMe, changePassword, registerAdmin } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/login', login);
router.post('/register-admin', registerAdmin);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);

module.exports = router;
