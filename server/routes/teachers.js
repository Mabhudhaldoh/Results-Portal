const router = require('express').Router();
const { getTeachers, createTeacher } = require('../controllers/teacherController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin'));

router.route('/').get(getTeachers).post(createTeacher);

module.exports = router;
