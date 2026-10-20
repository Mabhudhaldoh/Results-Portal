const router = require('express').Router();
const multer = require('multer');
const { getStudents, getStudent, createStudent, bulkCreateStudents, bulkQuickCreate, uploadExcelStudents } = require('../controllers/studentController');
const { protect, authorize } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(protect);

router.route('/').get(authorize('admin', 'teacher', 'headmaster', 'finance'), getStudents).post(authorize('admin'), createStudent);
router.post('/bulk', authorize('admin'), bulkCreateStudents);
router.post('/bulk-quick', authorize('admin'), bulkQuickCreate);
router.post('/upload-excel', authorize('admin'), upload.single('file'), uploadExcelStudents);
router.route('/:id').get(getStudent);

module.exports = router;
