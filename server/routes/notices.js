const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getNotices,
  createNotice,
  updateNotice,
  deleteNotice,
} = require('../controllers/noticeController');

router.get('/', protect, getNotices);
router.post('/', protect, authorize('admin', 'headmaster'), upload.single('file'), createNotice);
router.put('/:id', protect, authorize('admin', 'headmaster'), upload.single('file'), updateNotice);
router.delete('/:id', protect, authorize('admin', 'headmaster'), deleteNotice);

module.exports = router;
