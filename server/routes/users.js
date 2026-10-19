const router = require('express').Router();
const { getUsers, createUser, updateUser, deleteUser, resetPassword, toggleActive, assignSubjects, assignClasses, assignStudents, bulkUpdateUsers, bulkDeleteUsers } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin'));

router.route('/').get(getUsers).post(createUser);
router.put('/bulk/update', bulkUpdateUsers);
router.post('/bulk/delete', bulkDeleteUsers);
router.route('/:id').put(updateUser).delete(deleteUser);
router.put('/:id/reset-password', resetPassword);
router.put('/:id/toggle-active', toggleActive);
router.put('/:id/assign-subjects', assignSubjects);
router.put('/:id/assign-classes', assignClasses);
router.put('/:id/assign-students', assignStudents);

module.exports = router;
