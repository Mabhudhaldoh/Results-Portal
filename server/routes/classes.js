const router = require('express').Router();
const { getClasses, createClass, updateClass, deleteClass, getStreams, createStream } = require('../controllers/classController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/').get(getClasses).post(authorize('admin'), createClass);
router.route('/streams/all').get(getStreams);
router.post('/streams', authorize('admin'), createStream);
router.route('/:id').put(authorize('admin'), updateClass).delete(authorize('admin'), deleteClass);

module.exports = router;
