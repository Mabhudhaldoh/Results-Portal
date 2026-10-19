const router = require('express').Router();
const multer = require('multer');
const { getResults, createResult, updateResult, bulkCreateResults, uploadExcel, publishResults, lockResults, unlockResults, hideResults, verifyResults, unverifyResults, deleteResult, deleteBulkResults, calculatePositions, getStudentResults } = require('../controllers/resultController');
const { protect, authorize } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(protect);

router.route('/').get(getResults).post(authorize('admin', 'teacher'), createResult);
router.route('/student').get(authorize('student'), getStudentResults);
router.post('/bulk', authorize('admin', 'teacher'), bulkCreateResults);
router.post('/upload-excel', authorize('admin', 'teacher'), upload.single('file'), uploadExcel);
router.put('/publish', authorize('admin'), publishResults);
router.put('/bulk-delete', authorize('admin'), deleteBulkResults);
router.put('/lock', authorize('admin'), lockResults);
router.put('/unlock', authorize('admin'), unlockResults);
router.put('/hide', authorize('admin'), hideResults);
router.put('/verify', authorize('headmaster'), verifyResults);
router.put('/unverify', authorize('headmaster'), unverifyResults);
router.get('/positions', authorize('admin'), calculatePositions);
router.route('/:id').put(authorize('admin', 'teacher'), updateResult).delete(authorize('admin'), deleteResult);

module.exports = router;
