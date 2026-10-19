const router = require('express').Router();
const { getAcademicYears, createAcademicYear, updateAcademicYear, deleteAcademicYear, setActiveYear, addTerm, setActiveTerm } = require('../controllers/academicController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/').get(getAcademicYears).post(authorize('admin'), createAcademicYear);
router.route('/:id').put(authorize('admin'), updateAcademicYear).delete(authorize('admin'), deleteAcademicYear);
router.put('/:id/activate', authorize('admin'), setActiveYear);
router.post('/:id/terms', authorize('admin'), addTerm);
router.put('/:yearId/terms/:termId/activate', authorize('admin'), setActiveTerm);

module.exports = router;
