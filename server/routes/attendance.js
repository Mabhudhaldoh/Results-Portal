const router = require('express').Router();
const { getAttendance, bulkSaveAttendance } = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', authorize('admin', 'teacher', 'headmaster'), getAttendance);
router.post('/bulk', authorize('admin', 'teacher'), bulkSaveAttendance);

module.exports = router;
