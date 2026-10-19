const router = require('express').Router();
const { getGradings, createGrading, updateGrading, deleteGrading, applyGrading } = require('../controllers/gradingController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/').get(getGradings).post(authorize('admin'), createGrading);
router.route('/:id').put(authorize('admin'), updateGrading).delete(authorize('admin'), deleteGrading);
router.put('/:id/apply', authorize('admin'), applyGrading);

module.exports = router;
