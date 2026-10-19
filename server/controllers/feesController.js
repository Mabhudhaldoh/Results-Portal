const db = require("../config/database");

exports.getFeesStatus = async (req, res) => {
  try {
    const student = await db.collection('users').findById(req.user._id);
    if (!student || student.role !== 'student')
      return res.status(404).json({ success: false, message: 'Student not found' });
    const required = student.feesRequired || 0;
    const paid = student.feesPaid || 0;
    const balance = required - paid;
    const settingsArr = await db.collection('settings').find();
    const settings = settingsArr[0];
    const feesViewPercentage = settings?.feesViewPercentage || 50;
    const feesBlockingEnabled = settings?.feesBlockingEnabled !== false;
    const paidPercentage = required > 0 ? Math.round((paid / required) * 100) : 100;
    const canViewResults = !feesBlockingEnabled || paid >= required || paidPercentage >= feesViewPercentage;
    res.json({ success: true, status: { feesRequired: required, feesPaid: paid, feesBalance: balance, paidPercentage, feesViewPercentage, feesBlockingEnabled, canViewResults } });
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
