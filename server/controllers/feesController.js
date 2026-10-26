const db = require("../config/database");
const { getStudentFeeAccess } = require('../utils/studentFeeAccess');

exports.getFeesStatus = async (req, res) => {
  try {
    const student = await db.collection('users').findById(req.user._id);
    if (!student || student.role !== 'student')
      return res.status(404).json({ success: false, message: 'Student not found' });
    const required = student.feesRequired || 0;
    const paid = student.feesPaid || 0;
    const balance = required - paid;
    const access = await getStudentFeeAccess(student);
    const paidPercentage = required > 0 ? Math.round((paid / required) * 100) : 100;
    res.json({ success: true, status: { ...access, paidPercentage } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.recordPayment = async (req, res) => {
  try {
    const { studentId, amount, method, reference, description } = req.body;
    const student = await db.collection('users').findById(studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    student.feesPaid = (student.feesPaid || 0) + parseFloat(amount);
    student.feesBalance = (student.feesRequired || 0) - student.feesPaid;
    if (student.feesBalance < 0) student.feesBalance = 0;
    await db.collection('users').save(student);
    const payment = await db.collection('payments').create({
      studentId, amount: parseFloat(amount), method: method || 'Cash',
      reference: reference || '', description: description || '',
      date: new Date().toISOString(), recordedBy: req.user._id,
    });
    await db.collection('auditLogs').create({ user: req.user._id, action: 'RECORD_PAYMENT', target: studentId, details: `Payment of $${amount} for ${student.firstName} ${student.lastName}` });
    res.status(201).json({ success: true, payment, student: { _id: student._id, feesPaid: student.feesPaid, feesBalance: student.feesBalance } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPayments = async (req, res) => {
  try {
    let payments = await db.collection('payments').find();
    payments.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json({ success: true, payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateFees = async (req, res) => {
  try {
    const student = await db.collection('users').findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    student.feesRequired = req.body.feesRequired ?? student.feesRequired;
    student.feesBalance = (student.feesRequired || 0) - (student.feesPaid || 0);
    if (student.feesBalance < 0) student.feesBalance = 0;
    await db.collection('users').save(student);
    res.json({ success: true, student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.setStudentResultsAccessApproval = async (req, res) => {
  try {
    const { approved, note } = req.body;
    if (typeof approved !== 'boolean') return res.status(400).json({ success: false, message: 'approved must be true or false' });
    const student = await db.collection('users').findById(req.params.id);
    if (!student || student.role !== 'student') return res.status(404).json({ success: false, message: 'Student not found' });
    const access = await getStudentFeeAccess(student);
    if (access.feesBalance <= 100 && approved) {
      return res.status(400).json({ success: false, message: 'Students with balances of $100 or less already qualify automatically.' });
    }
    student.financeResultsAccessApproved = approved;
    student.financeResultsAccessBy = approved ? req.user._id : null;
    student.financeResultsAccessAt = approved ? new Date().toISOString() : null;
    student.financeResultsAccessNote = approved ? String(note || '').slice(0, 500) : '';
    // Revoking finance approval also removes the headmaster override.
    if (!approved) {
      student.headmasterResultsAccessOverride = false;
      student.headmasterResultsAccessBy = null;
      student.headmasterResultsAccessAt = null;
    }
    await db.collection('users').save(student);
    await db.collection('auditLogs').create({
      user: req.user._id, action: approved ? 'FINANCE_APPROVE_RESULTS_ACCESS' : 'FINANCE_REVOKE_RESULTS_ACCESS',
      target: student._id, details: (approved ? 'Finance approved' : 'Finance revoked') + ' special results access for ' + student.firstName + ' ' + student.lastName
    });
    res.json({ success: true, studentId: student._id, financeResultsAccessApproved: approved, headmasterResultsAccessOverride: student.headmasterResultsAccessOverride === true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
