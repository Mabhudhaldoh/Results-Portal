const router = require('express').Router();
const { getPendingFees } = require('../controllers/headmasterController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('headmaster'));

router.get('/pending-fees', getPendingFees);

module.exports = router;
