const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getSubmissions,
  createSubmission,
  gradeSubmission,
  deleteSubmission,
} = require('../controllers/submissionController');

router.get('/', protect, getSubmissions);
router.post('/', protect, upload.array('files', 5), createSubmission);
router.put('/:id/grade', protect, authorize('admin', 'teacher'), gradeSubmission);
router.delete('/:id', protect, authorize('admin', 'teacher'), deleteSubmission);

module.exports = router;
