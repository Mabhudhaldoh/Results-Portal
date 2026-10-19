const router = require('express').Router();
const { getStudentReport, getClassReport, getSubjectReport, getTopStudents, bulkDownloadReports, getAnalytics } = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/student', getStudentReport);
router.get('/class', authorize('admin', 'teacher'), getClassReport);
router.get('/subject', authorize('admin', 'teacher'), getSubjectReport);
router.get('/top-students', getTopStudents);
router.post('/bulk-download', authorize('admin', 'teacher', 'headmaster'), bulkDownloadReports);
router.get('/analytics', getAnalytics);

module.exports = router;
