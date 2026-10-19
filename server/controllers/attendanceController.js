const db = require("../config/database");

exports.getAttendance = async (req, res) => {
  try {
    const { className, stream, academicYear, term } = req.query;
    const filter = {};
    if (academicYear) filter.academicYear = academicYear;
    if (term) filter.term = term;
    let records = await db.collection('attendance').find(filter);
    if (className) records = records.filter(r => r.className === className);
    if (stream) records = records.filter(r => r.stream === stream);

    records = await Promise.all(records.map(async r => {
      const out = { ...r };
      out.student = await db.collection('users').findById(r.student) || { firstName: '?', lastName: '?', admissionNumber: '?' };
      if (out.student.password) delete out.student.password;
      return out;
    }));

    res.json({ success: true, attendance: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.bulkSaveAttendance = async (req, res) => {
  try {
    const { academicYear, term, className, stream, records } = req.body;
    if (!records || !Array.isArray(records)) return res.status(400).json({ success: false, message: 'records array required' });
    if (!academicYear || !term) return res.status(400).json({ success: false, message: 'academicYear and term required' });

    let saved = 0;
    for (const rec of records) {
      if (!rec.student) continue;
      const existing = await db.collection('attendance').findOne({ student: rec.student, academicYear, term });
      const data = {
        student: rec.student,
        className: rec.className || className || '',
        stream: rec.stream || stream || '',
        academicYear,
        term,
        daysPresent: rec.daysPresent || 0,
        daysAbsent: rec.daysAbsent || 0,
        totalDays: rec.totalDays || 0,
      };
      if (existing) {
        Object.assign(existing, data);
        await db.collection('attendance').save(existing);
      } else {
        await db.collection('attendance').create(data);
      }
      saved++;
    }
    await db.collection('auditLogs').create({ user: req.user._id, action: 'SAVE_ATTENDANCE', details: `Saved attendance for ${saved} students (${term})` });
    res.json({ success: true, saved });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
