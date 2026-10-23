const db = require("../config/database");
const { getStudentFeeAccess } = require("../utils/studentFeeAccess");

exports.getPendingFees = async (req, res) => {
  try {
    const students = await db.collection('users').find({ role: 'student' });
    const pending = [];
    for (const s of students) {
      const access = await getStudentFeeAccess(s);
      if (access.feesBalance <= 0) continue;
      pending.push({
        studentId: s._id, admissionNumber: s.admissionNumber,
        firstName: s.firstName, lastName: s.lastName,
        className: s.className ? await db.collection('classes').findById(s.className) : null,
        stream: s.stream ? await db.collection('streams').findById(s.stream) : null,
        ...access,
      });
    }
    pending.sort((a, b) => b.feesBalance - a.feesBalance);
    res.json({ success: true, pending, automaticAccessThreshold: 100 });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.setHeadmasterResultsAccessOverride = async (req, res) => {
  try {
    const { enabled, note } = req.body;
    if (typeof enabled !== 'boolean') return res.status(400).json({ success: false, message: 'enabled must be true or false' });
    const student = await db.collection('users').findById(req.params.id);
    if (!student || student.role !== 'student') return res.status(404).json({ success: false, message: 'Student not found' });
    const access = await getStudentFeeAccess(student);
    if (access.feesBalance < 100) {
      return res.status(400).json({ success: false, message: 'This student already qualifies for automatic results access.' });
    }
    if (enabled && student.financeResultsAccessApproved !== true) {
      return res.status(403).json({ success: false, message: 'Finance department approval is required before the headmaster can grant access.' });
    }
    student.headmasterResultsAccessOverride = enabled;
    student.headmasterResultsAccessBy = enabled ? req.user._id : null;
    student.headmasterResultsAccessAt = enabled ? new Date().toISOString() : null;
    student.headmasterResultsAccessNote = enabled ? String(note || '').slice(0, 500) : '';
    await db.collection('users').save(student);
    await db.collection('auditLogs').create({
      user: req.user._id,
      action: enabled ? 'HEADMASTER_GRANT_RESULTS_ACCESS' : 'HEADMASTER_REVOKE_RESULTS_ACCESS',
      target: student._id,
      details: (enabled ? 'Headmaster granted' : 'Headmaster revoked') + ' special results access for ' + student.firstName + ' ' + student.lastName
    });
    res.json({ success: true, studentId: student._id, headmasterResultsAccessOverride: enabled });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
