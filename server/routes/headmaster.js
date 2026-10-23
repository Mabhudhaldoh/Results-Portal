const router = require('express').Router();
const { getPendingFees, setHeadmasterResultsAccessOverride } = require('../controllers/headmasterController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('headmaster'));

router.get('/pending-fees', getPendingFees);
router.patch('/:id/results-access-override', setHeadmasterResultsAccessOverride);

module.exports = router;
