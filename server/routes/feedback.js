const router = require('express').Router();
const { getFeedback, createFeedback, markRead, deleteFeedback } = require('../controllers/feedbackController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/').get(getFeedback).post(authorize('headmaster'), createFeedback);
router.put('/:id/read', markRead);
router.delete('/:id', authorize('headmaster'), deleteFeedback);

module.exports = router;
