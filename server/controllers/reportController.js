const db = require("../config/database");

async function getEffectiveYearTerm(academicYear, term) {
  const settingsArr = await db.collection('settings').find();
  const settings = settingsArr[0] || {};
  return {
    academicYear: academicYear || settings.academicYear || '',
    term: term || settings.currentTerm || '',
  };
}

exports.getStudentReport = async (req, res) => {
  try {
    const { studentId, academicYear, term } = req.query;
    const studentIdParam = req.user.role === 'student' ? req.user._id : (studentId || req.user._id);
    const student = await db.collection('users').findById(studentIdParam);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const settingsArr = await db.collection('settings').find();
    const settings = settingsArr[0];
    let resultsHidden = false;
    let resultsHiddenMessage = null;
    if (req.user.role === 'student') {
      const visibility = await require('../utils/resultsVisibility').getResultsVisibility();
      const feeAccess = await require('../utils/studentFeeAccess').getStudentFeeAccess(student);
      if (!visibility.visible) {
        resultsHidden = true;
        resultsHiddenMessage = visibility.message;
      } else if (!feeAccess.canViewResults) {
        resultsHidden = true;
        resultsHiddenMessage = feeAccess.resultsAccessMessage;
      }
    }
    let results = [];
    if (!resultsHidden) {
      results = await db.collection('results').find({ student: studentIdParam, status: 'published' });
      if (req.user.role === 'student') {
        results = results.filter(r => r.verifiedBy && r.publishedBy);
      }
      if (academicYear) results = results.filter(r => r.academicYear === academicYear);
      if (term) results = results.filter(r => r.term === term);

      results = await Promise.all(results.map(async r => ({
        ...r,
        subject: await db.collection('subjects').findById(r.subject) || null,
        teacher: await db.collection('users').findById(r.teacher) || null,
      })));
    }

    const totalMarks = results.reduce((sum, r) => sum + (r.finalMark || 0), 0);
    const average = results.length > 0 ? Math.round((totalMarks / results.length) * 100) / 100 : 0;

    const eff = await getEffectiveYearTerm(academicYear, term);
    const attendanceArr = await db.collection('attendance').find({ student: studentIdParam, academicYear: eff.academicYear, term: eff.term });
    const attendance = attendanceArr.length > 0 ? attendanceArr[0] : null;

    const studentData = { ...student };
    if (studentData.password) delete studentData.password;
    studentData.className = await db.collection('classes').findById(student.className) || student.className;
    studentData.stream = await db.collection('streams').findById(student.stream) || student.stream;

    res.json({ success: true, report: { student: studentData, results, average, attendance, settings, academicYear: eff.academicYear, term: eff.term, resultsHidden, resultsHiddenMessage } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getClassReport = async (req, res) => {
  try {
    const { className, academicYear, term } = req.query;
    let results = await db.collection('results').find({ className, status: 'published' });
    if (academicYear) results = results.filter(r => r.academicYear === academicYear);
    if (term) results = results.filter(r => r.term === term);

    const studentPerformance = {};
    results.forEach(r => {
      if (!studentPerformance[r.student]) studentPerformance[r.student] = { totalMark: 0, count: 0, results: [] };
      studentPerformance[r.student].totalMark += r.finalMark || 0;
      studentPerformance[r.student].count++;
      studentPerformance[r.student].results.push(r);
    });

    const performance = await Promise.all(Object.entries(studentPerformance)
      .map(async ([sid, p]) => {
        const user = await db.collection('users').findById(sid);
        return { student: user ? { _id: user._id, firstName: user.firstName, lastName: user.lastName, admissionNumber: user.admissionNumber } : { _id: sid }, totalMark: p.totalMark, count: p.count, results: p.results, average: p.count > 0 ? Math.round((p.totalMark / p.count) * 100) / 100 : 0 };
      }));
    performance.sort((a, b) => b.average - a.average);
    performance.forEach((p, i) => { p.position = i + 1; });

    res.json({ success: true, report: { performance, totalResults: results.length } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSubjectReport = async (req, res) => {
  try {
    const { subject, academicYear, term } = req.query;
    let results = await db.collection('results').find({ subject, status: 'published' });
    if (academicYear) results = results.filter(r => r.academicYear === academicYear);
    if (term) results = results.filter(r => r.term === term);

    results = await Promise.all(results.map(async r => ({
      ...r,
      student: await db.collection('users').findById(r.student) || null,
      className: await db.collection('classes').findById(r.className) || null,
    })));

    const totalMarks = results.reduce((sum, r) => sum + (r.finalMark || 0), 0);
    const average = results.length > 0 ? Math.round((totalMarks / results.length) * 100) / 100 : 0;
    const passCount = results.filter(r => r.finalMark >= 50).length;
    const passRate = results.length > 0 ? Math.round((passCount / results.length) * 100) : 0;

    res.json({ success: true, report: { results, average, passRate, totalStudents: results.length } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTopStudents = async (req, res) => {
  try {
    const { academicYear, term, limit = 10 } = req.query;
    let results = await db.collection('results').find({ status: 'published' });
    if (academicYear) results = results.filter(r => r.academicYear === academicYear);
    if (term) results = results.filter(r => r.term === term);

    const studentAvgs = {};
    results.forEach(r => {
      if (!studentAvgs[r.student]) studentAvgs[r.student] = { total: 0, count: 0 };
      studentAvgs[r.student].total += r.finalMark || 0;
      studentAvgs[r.student].count++;
    });

    const ranked = await Promise.all(Object.entries(studentAvgs)
      .map(async ([id, data]) => {
        const user = await db.collection('users').findById(id);
        return { _id: user ? { _id: user._id, firstName: user.firstName, lastName: user.lastName, admissionNumber: user.admissionNumber } : { _id: id }, avgMark: data.count > 0 ? data.total / data.count : 0, totalSubjects: data.count };
      }));
    ranked.sort((a, b) => b.avgMark - a.avgMark);
    ranked.slice(0, parseInt(limit));

    res.json({ success: true, students: ranked });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.bulkDownloadReports = async (req, res) => {
  try {
    const { studentIds, academicYear, term } = req.body;
    if (!studentIds || !Array.isArray(studentIds)) return res.status(400).json({ success: false, message: 'studentIds array required' });
    const reports = [];
    for (const sid of studentIds) {
      const student = await db.collection('users').findById(sid);
      if (!student) continue;
      let results = await db.collection('results').find({ student: sid, status: 'published' });
      if (academicYear) results = results.filter(r => r.academicYear === academicYear);
      if (term) results = results.filter(r => r.term === term);
      if (results.length === 0) continue;
      results = await Promise.all(results.map(async r => ({
        ...r, subject: await db.collection('subjects').findById(r.subject) || null,
        teacher: await db.collection('users').findById(r.teacher) || null,
      })));
      const totalMarks = results.reduce((sum, r) => sum + (r.finalMark || 0), 0);
      const average = results.length > 0 ? Math.round((totalMarks / results.length) * 100) / 100 : 0;
      const eff = await getEffectiveYearTerm(academicYear, term);
      const attendanceArr = await db.collection('attendance').find({ student: sid, academicYear: eff.academicYear, term: eff.term });
      const attendance = attendanceArr.length > 0 ? attendanceArr[0] : null;
      const { password, ...safeStudent } = student;
      safeStudent.className = safeStudent.className ? await db.collection('classes').findById(safeStudent.className) || safeStudent.className : null;
      safeStudent.stream = safeStudent.stream ? await db.collection('streams').findById(safeStudent.stream) || safeStudent.stream : null;
      reports.push({ student: safeStudent, results, average, attendance });
    }
    res.json({ success: true, reports });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const { academicYear, term } = req.query;
    let results = await db.collection('results').find({ status: 'published' });
    if (academicYear) results = results.filter(r => r.academicYear === academicYear);
    if (term) results = results.filter(r => r.term === term);

    const totalResults = results.length;
    const avgMark = results.length > 0 ? results.reduce((s, r) => s + (r.finalMark || 0), 0) / results.length : 0;
    const minMark = results.length > 0 ? Math.min(...results.map(r => r.finalMark || 0)) : 0;
    const maxMark = results.length > 0 ? Math.max(...results.map(r => r.finalMark || 0)) : 0;

    const subjectMap = {};
    results.forEach(r => {
      if (!subjectMap[r.subject]) subjectMap[r.subject] = { total: 0, count: 0 };
      subjectMap[r.subject].total += r.finalMark || 0;
      subjectMap[r.subject].count++;
    });
    const subjectPerformance = await Promise.all(Object.entries(subjectMap).map(async ([id, data]) => ({
      _id: id, avgMark: data.count > 0 ? data.total / data.count : 0, count: data.count,
      subject: await db.collection('subjects').findById(id) || { name: 'Unknown' },
    })));
    subjectPerformance.sort((a, b) => b.avgMark - a.avgMark);

    const classMap = {};
    results.forEach(r => {
      if (!classMap[r.className]) classMap[r.className] = { total: 0, count: 0 };
      classMap[r.className].total += r.finalMark || 0;
      classMap[r.className].count++;
    });
    const classPerformance = await Promise.all(Object.entries(classMap).map(async ([id, data]) => ({
      _id: id, avgMark: data.count > 0 ? data.total / data.count : 0, count: data.count,
      className: await db.collection('classes').findById(id) || { name: 'Unknown' },
    })));
    classPerformance.sort((a, b) => b.avgMark - a.avgMark);

    const gradeMap = {};
    results.forEach(r => {
      const g = r.grade || 'N/A';
      gradeMap[g] = (gradeMap[g] || 0) + 1;
    });
    const gradeDistribution = Object.entries(gradeMap).map(([grade, count]) => ({ _id: grade, count }));

    res.json({ success: true, analytics: { totalResults, summary: { avg: Math.round(avgMark * 100) / 100, min: minMark, max: maxMark }, subjectPerformance, classPerformance, gradeDistribution } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
