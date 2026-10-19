const db = require("../config/database");

exports.getPendingFees = async (req, res) => {
  try {
    let students = await db.collection('users').find({ role: 'student' });
    const settingsArr = await db.collection('settings').find();
    const settings = settingsArr[0];
    const feesViewPercentage = settings?.feesViewPercentage || 50;
    const feesBlockingEnabled = settings?.feesBlockingEnabled !== false;

    const pending = students
      .filter(s => (s.feesRequired || 0) - (s.feesPaid || 0) > 0)
      .map(s => {
        const required = s.feesRequired || 0;
        const paid = s.feesPaid || 0;
        const balance = required - paid;
        const paidPercentage = required > 0 ? Math.round((paid / required) * 100) : 100;
        const canViewResults = !feesBlockingEnabled || paid >= required || paidPercentage >= feesViewPercentage;
        return {
          studentId: s._id, admissionNumber: s.admissionNumber,
          firstName: s.firstName, lastName: s.lastName,
          className: s.className, stream: s.stream,
          feesRequired: required, feesPaid: paid, feesBalance: balance,
          paidPercentage, canViewResults,
        };
      });

    res.json({ success: true, pending, feesViewPercentage });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
