const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} = require('../controllers/eventController');

router.get('/', protect, getEvents);
router.post('/', protect, authorize('admin', 'headmaster'), upload.single('file'), createEvent);
router.put('/:id', protect, authorize('admin', 'headmaster'), upload.single('file'), updateEvent);
router.delete('/:id', protect, authorize('admin', 'headmaster'), deleteEvent);

module.exports = router;
