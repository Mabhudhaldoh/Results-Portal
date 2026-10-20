const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getNotices,
  getNoticeRecipients,
  createNotice,
  updateNotice,
  deleteNotice,
} = require('../controllers/noticeController');

router.get('/', protect, getNotices);
router.get('/recipients', protect, authorize('admin', 'headmaster', 'finance'), getNoticeRecipients);
router.post('/', protect, authorize('admin', 'headmaster', 'finance'), upload.single('file'), createNotice);
router.put('/:id', protect, authorize('admin', 'headmaster', 'finance'), upload.single('file'), updateNotice);
router.delete('/:id', protect, authorize('admin', 'headmaster', 'finance'), deleteNotice);

module.exports = router;
