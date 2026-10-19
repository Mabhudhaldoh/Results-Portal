const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getAssignments,
  getAssignment,
  createAssignment,
  updateAssignment,
  deleteAssignment,
} = require('../controllers/assignmentController');

router.get('/', protect, getAssignments);
router.get('/:id', protect, getAssignment);
router.post('/', protect, authorize('admin', 'teacher'), upload.array('files', 5), createAssignment);
router.put('/:id', protect, authorize('admin', 'teacher'), upload.array('files', 5), updateAssignment);
router.delete('/:id', protect, authorize('admin', 'teacher'), deleteAssignment);

module.exports = router;
