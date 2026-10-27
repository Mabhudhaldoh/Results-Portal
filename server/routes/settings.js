const router = require('express').Router();
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/').get(getSettings).put(authorize('admin', 'finance', 'headmaster'), updateSettings);

module.exports = router;
