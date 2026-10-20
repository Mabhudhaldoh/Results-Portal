const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getEvents,
  getEventRecipients,
  createEvent,
  updateEvent,
  deleteEvent,
} = require('../controllers/eventController');

router.get('/', protect, getEvents);
router.get('/recipients', protect, authorize('admin', 'headmaster', 'finance'), getEventRecipients);
router.post('/', protect, authorize('admin', 'headmaster', 'finance'), upload.single('file'), createEvent);
router.put('/:id', protect, authorize('admin', 'headmaster', 'finance'), upload.single('file'), updateEvent);
router.delete('/:id', protect, authorize('admin', 'headmaster', 'finance'), deleteEvent);

module.exports = router;
