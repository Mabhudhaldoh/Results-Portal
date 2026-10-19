const router = require('express').Router();
const { getFeesStatus, recordPayment, getPayments, updateFees } = require('../controllers/feesController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/status', getFeesStatus);
router.post('/payment', authorize('admin', 'finance'), recordPayment);
router.get('/payments', authorize('admin', 'finance'), getPayments);
router.put('/:id', authorize('admin', 'finance'), updateFees);

module.exports = router;
