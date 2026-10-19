const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getResources,
  createResource,
  deleteResource,
} = require('../controllers/resourceController');

router.get('/', protect, getResources);
router.post('/', protect, authorize('admin', 'teacher'), upload.array('files', 10), createResource);
router.delete('/:id', protect, authorize('admin', 'teacher'), deleteResource);

module.exports = router;
