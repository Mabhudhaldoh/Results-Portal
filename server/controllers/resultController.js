const db = require("../config/database");
const XLSX = require('xlsx');

function calcFinalMark(termMark, examMark, projectMark) {
  return Math.round(((examMark || 0) * 0.8 + (projectMark || 0) * 0.2) * 100) / 100;
}

async function applyGrade(finalMark) {
  let gradings = await db.collection('gradings').find({ isActive: true });
  let grading = gradings[0];
  if (!grading) {
    gradings = await db.collection('gradings').find();
    grading = gradings[0];
  }
  if (!grading) return { grade: '', points: 0, gradeRemark: '' };
  const level = grading.levels.find(l => finalMark >= l.minMark && finalMark <= l.maxMark);
  if (level) return { grade: level.grade, points: level.points, gradeRemark: level.remark || '' };
  return { grade: '', points: 0, gradeRemark: '' };
}

exports.getResults = async (req, res) => {
  try {
    const { student, className, subject, academicYear, term, status, teacher } = req.query;
    let results = await db.collection('results').find();

    if (student) results = results.filter(r => r.student === student);
    if (className) results = results.filter(r => r.className === className);
    if (subject) results = results.filter(r => r.subject === subject);
    if (academicYear) results = results.filter(r => r.academicYear === academicYear);
    if (term) results = results.filter(r => r.term === term);
    if (status) results = results.filter(r => r.status === status);
    if (teacher) results = results.filter(r => r.teacher === teacher);

    if (req.user.role === 'teacher') results = results.filter(r => r.teacher === req.user._id);
    if (req.user.role === 'student') {
      const student = await db.collection('users').findById(req.user._id);
      const feeAccess = await require('../utils/studentFeeAccess').getStudentFeeAccess(student);
      const visibility = await require('../utils/resultsVisibility').getResultsVisibility();
      if (!feeAccess.canViewResults || !visibility.visible) {
        return res.json({ success: true, results: [], visible: false, message: !visibility.visible ? visibility.message : feeAccess.resultsAccessMessage });
      }
      results = results.filter(r => r.student === req.user._id && r.status === 'published');
    }

    results = await Promise.all(results.map(async r => {
      const out = { ...r };
      out.student = await db.collection('users').findById(r.student) || { firstName: '?', lastName: '?', admissionNumber: '?' };
      out.subject = await db.collection('subjects').findById(r.subject) || { name: '?', code: '?' };
      out.teacher = await db.collection('users').findById(r.teacher) || { firstName: '?', lastName: '?' };
      out.className = await db.collection('classes').findById(r.className) || { name: '?' };
      out.stream = r.stream ? await db.collection('streams').findById(r.stream) : null;
      out.academicYear = await db.collection('academicYears').findById(r.academicYear) || { name: '?' };
      if (out.student && out.student.password) delete out.student.password;
      if (out.teacher && out.teacher.password) delete out.teacher.password;
      return out;
    }));

    results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createResult = async (req, res) => {
  try {
    const existing = await db.collection('results').findOne({
      student: req.body.student, subject: req.body.subject,
      academicYear: req.body.academicYear, term: req.body.term
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Result already exists for this student/subject/term' });
    }
    const finalMark = calcFinalMark(req.body.termMark, req.body.examMark, req.body.projectMark);
    const gradeInfo = await applyGrade(finalMark);
    const result = await db.collection('results').create({
      ...req.body, teacher: req.user._id, finalMark, ...gradeInfo, status: 'draft'
    });
    res.status(201).json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateResult = async (req, res) => {
  try {
    const result = await db.collection('results').findById(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'Result not found' });
    if (result.status === 'locked') {
      return res.status(400).json({ success: false, message: 'Result is locked and cannot be edited' });
    }
    const previousStatus = result.status;
    // Accept only mark/remark fields. Never accept status or publication metadata from a client request.
    for (const field of ['termMark', 'examMark', 'projectMark', 'teacherRemark']) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) result[field] = req.body[field];
    }
    result.finalMark = calcFinalMark(result.termMark, result.examMark, result.projectMark);
    const gradeInfo = await applyGrade(result.finalMark);
    Object.assign(result, gradeInfo);
    if (['verified', 'published', 'hidden'].includes(previousStatus)) {
      // Editing invalidates any previous verification/publication decision.
      result.status = 'draft';
      result.verifiedBy = null;
      result.verifiedAt = null;
      result.publishedBy = null;
      result.publishedAt = null;
    }
    await db.collection('results').save(result);
    res.json({ success: true, result, message: result.status === 'draft' ? 'Result updated and returned to draft for Headmaster verification' : 'Result updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.bulkCreateResults = async (req, res) => {
  try {
    const { results } = req.body;
    const created = [];
    const errors = [];
    for (const r of results) {
      try {
        const existing = await db.collection('results').findOne({
          student: r.student, subject: r.subject,
          academicYear: r.academicYear, term: r.term
        });
        if (existing) { errors.push({ student: r.student, message: 'Already exists' }); continue; }
        const finalMark = calcFinalMark(r.termMark, r.examMark, r.projectMark);
        const gradeInfo = await applyGrade(finalMark);
        const result = await db.collection('results').create({
          ...r, teacher: req.user._id, finalMark, ...gradeInfo, status: 'draft'
        });
        created.push(result);
      } catch (err) {
        errors.push({ student: r.student, message: err.message });
      }
    }
    res.status(201).json({ success: true, created: created.length, errors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.uploadExcel = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);
    const created = [];
    const errors = [];
    for (const row of data) {
      try {
        const admNo = row['Admission Number'] || row['admissionNumber'];
        const student = await db.collection('users').findOne({ admissionNumber: admNo, role: 'student' });
        if (!student) { errors.push({ row: admNo, message: 'Student not found' }); continue; }
        const termMark = row['Term Mark'] || row['termMark'] || 0;
        const examMark = row['Exam Mark'] || row['examMark'] || 0;
        const projectMark = row['Project Mark'] || row['projectMark'] || 0;
        const finalMark = calcFinalMark(termMark, examMark, projectMark);
        const gradeInfo = await applyGrade(finalMark);
        const result = await db.collection('results').create({
          student: student._id, subject: req.body.subject, teacher: req.user._id,
          className: student.className, stream: student.stream,
          academicYear: req.body.academicYear, term: req.body.term,
          termMark, examMark, projectMark, finalMark, ...gradeInfo,
          teacherRemark: row['Remarks'] || row['remarks'] || '', status: 'draft'
        });
        created.push(result);
      } catch (err) {
        errors.push({ row: row['Admission Number'], message: err.message });
      }
    }
    res.status(201).json({ success: true, created: created.length, errors, total: data.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.publishResults = async (req, res) => {
  try {
    const { ids, scheduleFrom, hideAfter } = req.body;
    if (req.user.role !== 'headmaster') {
      return res.status(403).json({ success: false, message: 'Only the Headmaster can publish results.' });
    }
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Select at least one verified result to publish.' });
    }

    const selectedResults = [];
    for (const id of ids) {
      const result = await db.collection('results').findById(id);
      if (!result) return res.status(404).json({ success: false, message: 'A selected result could not be found. Refresh and try again.' });
      if (result.status !== 'verified') {
        return res.status(400).json({
          success: false,
          message: 'Publication blocked: every selected result must first be verified by the Headmaster. At least one selected result is not verified.'
        });
      }
      selectedResults.push(result);
    }

    for (const result of selectedResults) {
      result.status = 'published';
      result.publishedBy = req.user._id;
      result.publishedAt = new Date().toISOString();
      await db.collection('results').save(result);
    }

    if (scheduleFrom || hideAfter) {
      const settingsArr = await db.collection('settings').find();
      let settings = settingsArr[0];
      const from = scheduleFrom ? new Date(scheduleFrom) : new Date();
      const to = hideAfter ? new Date(hideAfter) : null;
      const visibility = {
        enabled: true,
        from: from.toISOString(),
        to: to ? to.toISOString() : null,
      };
      if (settings) {
        settings.resultsVisibility = visibility;
        await db.collection('settings').save(settings);
      } else {
        await db.collection('settings').create({ resultsVisibility: visibility });
      }
    }

    await db.collection('auditLogs').create({ user: req.user._id, action: 'PUBLISH_RESULTS', details: `Published ${ids.length} results` });
    res.json({ success: true, message: `Published ${selectedResults.length} Headmaster-verified result(s).` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteBulkResults = async (req, res) => {
  try {
    const { ids } = req.body;
    let deleted = 0;
    for (const id of ids) {
      const r = await db.collection('results').findById(id);
      if (!r) continue;
      if (r.status === 'locked') continue;
      await db.collection('results').findByIdAndDelete(id);
      deleted++;
    }
    await db.collection('auditLogs').create({ user: req.user._id, action: 'BULK_DELETE_RESULTS', details: `Deleted ${deleted} results` });
    res.json({ success: true, deleted, message: `${deleted} results deleted` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.lockResults = async (req, res) => {
  try {
    const { ids } = req.body;
    for (const id of ids) {
      const r = await db.collection('results').findById(id);
      if (r) { r.status = 'locked'; await db.collection('results').save(r); }
    }
    res.json({ success: true, message: 'Results locked' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.unlockResults = async (req, res) => {
  try {
    const { ids } = req.body;
    for (const id of ids) {
      const r = await db.collection('results').findById(id);
      if (r) { r.status = 'submitted'; await db.collection('results').save(r); }
    }
    res.json({ success: true, message: 'Results unlocked' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.hideResults = async (req, res) => {
  try {
    const { ids } = req.body;
    for (const id of ids) {
      const r = await db.collection('results').findById(id);
      if (r) { r.status = 'hidden'; await db.collection('results').save(r); }
    }
    res.json({ success: true, message: 'Results hidden' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteResult = async (req, res) => {
  try {
    const result = await db.collection('results').findById(req.params.id);
    if (!result) return res.status(404).json({ success: false, message: 'Result not found' });
    if (result.status === 'locked') return res.status(400).json({ success: false, message: 'Cannot delete locked result' });
    await db.collection('results').findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Result deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.verifyResults = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Select at least one result to verify.' });
    }
    let verified = 0;
    for (const id of ids) {
      const result = await db.collection('results').findById(id);
      if (!result || !['draft', 'submitted'].includes(result.status)) continue;
      result.status = 'verified';
      result.verifiedBy = req.user._id;
      result.verifiedAt = new Date().toISOString();
      await db.collection('results').save(result);
      verified++;
    }
    await db.collection('auditLogs').create({ user: req.user._id, action: 'VERIFY_RESULTS', details: `Verified ${verified} result(s)` });
    res.json({ success: true, message: `Verified ${verified} result(s). Only these verified results can be published.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.unverifyResults = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Select at least one result to return for review.' });
    }
    let returned = 0;
    for (const id of ids) {
      const result = await db.collection('results').findById(id);
      if (!result || !['verified', 'published'].includes(result.status)) continue;
      result.status = 'submitted';
      result.verifiedBy = null;
      result.verifiedAt = null;
      result.publishedBy = null;
      result.publishedAt = null;
      await db.collection('results').save(result);
      returned++;
    }
    await db.collection('auditLogs').create({ user: req.user._id, action: 'UNVERIFY_RESULTS', details: `Returned ${returned} result(s) for review` });
    res.json({ success: true, message: `Returned ${returned} result(s) for review. They are no longer published.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.calculatePositions = async (req, res) => {
  try {
    const { className, academicYear, term, subject } = req.query;
    let results = await db.collection('results').find({ className, academicYear, term, status: 'published' });
    if (subject) results = results.filter(r => r.subject === subject);
    results.sort((a, b) => b.finalMark - a.finalMark);
    let position = 1;
    for (let i = 0; i < results.length; i++) {
      if (i > 0 && results[i].finalMark < results[i - 1].finalMark) position = i + 1;
      results[i].position = position;
      await db.collection('results').save(results[i]);
    }
    res.json({ success: true, message: 'Positions calculated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStudentResults = async (req, res) => {
  try {
    const { academicYear, term } = req.query;
    const visibility = await require('../utils/resultsVisibility').getResultsVisibility();
    if (!visibility.visible) {
      return res.json({ success: true, results: [], visible: false, message: visibility.message });
    }
    const student = await db.collection('users').findById(req.user._id);
    const feeAccess = await require('../utils/studentFeeAccess').getStudentFeeAccess(student);
    if (!feeAccess.canViewResults) {
      return res.json({ success: true, results: [], visible: false, message: feeAccess.resultsAccessMessage, feeAccess });
    }
    let results = await db.collection('results').find({ student: req.user._id, status: 'published' });
    if (academicYear) results = results.filter(r => r.academicYear === academicYear);
    if (term) results = results.filter(r => r.term === term);
    results = await Promise.all(results.map(async r => ({
      ...r,
      subject: await db.collection('subjects').findById(r.subject) || null,
      academicYear: await db.collection('academicYears').findById(r.academicYear) || null,
      teacher: await db.collection('users').findById(r.teacher) || null,
    })));
    results.sort((a, b) => (a.subject?.name || '').localeCompare(b.subject?.name || ''));
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
