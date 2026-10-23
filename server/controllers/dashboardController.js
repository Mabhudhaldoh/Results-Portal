const db = require("../config/database");

exports.getDashboard = async (req, res) => {
  try {
    const allStudents = await db.collection('users').find({ role: 'student', isActive: true });
    const totalStudents = allStudents.length;
    const allTeachers = await db.collection('users').find({ role: 'teacher', isActive: true });
    const totalTeachers = allTeachers.length;
    const allResults = await db.collection('results').find();
    const publishedResults = allResults.filter(r => r.status === 'published').length;
    const pendingResults = allResults.filter(r => r.status === 'draft' || r.status === 'submitted').length;
    const allClasses = await db.collection('classes').find();
    const totalClasses = allClasses.length;
    const allSubjects = await db.collection('subjects').find();
    const totalSubjects = allSubjects.length;

    const activeYears = await db.collection('academicYears').find({ isActive: true });
    const activeYear = activeYears[0];
    let currentTerm = '';
    if (activeYear && activeYear.terms) {
      const activeT = activeYear.terms.find(t => t.isActive);
      if (activeT) currentTerm = activeT.name;
    }

    let recentResults = await db.collection('results').find();
    recentResults.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    recentResults = recentResults.slice(0, 10);
    const recentResultsPopulated = await Promise.all(recentResults.map(async r => ({
      ...r,
      student: await db.collection('users').findById(r.student) || { firstName: '?', lastName: '?' },
      subject: await db.collection('subjects').findById(r.subject) || { name: '?' },
    })));

    const published = allResults.filter(r => r.status === 'published');
    const avgMark = published.length > 0 ? published.reduce((s, r) => s + (r.finalMark || 0), 0) / published.length : 0;
    const passRate = published.length > 0 ? Math.round(published.filter(r => r.finalMark >= 50).length / published.length * 100) : 0;

    let teacherResults = [];
    if (req.user.role === 'teacher') {
      teacherResults = allResults.filter(r => (r.teacher === req.user._id && (r.status === 'draft' || r.status === 'submitted'))).slice(0, 10);
    }

    let studentResults = [];
    let feesStatus = null;
    let resultsHiddenMessage = null;
    if (req.user.role === 'student') {
      const visibility = await require('../utils/resultsVisibility').getResultsVisibility();
      const student = await db.collection('users').findById(req.user._id);
      const feeAccess = await require('../utils/studentFeeAccess').getStudentFeeAccess(student);
      if (!visibility.visible) {
        resultsHiddenMessage = visibility.message;
      } else if (!feeAccess.canViewResults) {
        resultsHiddenMessage = feeAccess.resultsAccessMessage;
      } else {
        studentResults = allResults.filter(r => r.student === req.user._id && r.status === 'published' && r.verifiedBy && r.publishedBy).slice(0, 10);
        studentResults = await Promise.all(studentResults.map(async r => ({
          ...r,
          subject: await db.collection('subjects').findById(r.subject) || null,
        })));
      }
      const required = student?.feesRequired || 0;
      const paid = student?.feesPaid || 0;
      const paidPercentage = required > 0 ? Math.round((paid / required) * 100) : 100;
      feesStatus = { ...feeAccess, paidPercentage };
    }

    let latestNotices = (await db.collection('notices').find({ isActive: true }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    if (req.user.role === 'student') {
      const student = await db.collection('users').findById(req.user._id);
      latestNotices = latestNotices.filter(n => {
        if (n.audience === 'teachers') return false;
        if (n.audience === 'form') return !n.className || n.className === student?.className;
        return true;
      });
    } else if (req.user.role !== 'admin' && req.user.role !== 'headmaster') {
      latestNotices = latestNotices.filter(n => n.audience !== 'students');
    }

    const now = new Date();
    const upcomingEvents = (await db.collection('events').find())
      .filter(e => new Date(e.date) >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5);

    let recentAssignments = [];
    if (req.user.role === 'student') {
      const student = await db.collection('users').findById(req.user._id);
      const className = student?.className;
      const stream = student?.stream;
      let assignments = (await db.collection('assignments').find({ isActive: true }))
        .filter(a => !className || !a.className || a.className === className)
        .filter(a => !stream || !a.stream || a.stream === stream);
      assignments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      recentAssignments = await Promise.all(assignments.slice(0, 5).map(async a => {
        const subs = await db.collection('submissions').find({ assignment: a._id, student: req.user._id });
        const subject = a.subject ? await db.collection('subjects').findById(a.subject) : null;
        return {
          ...a,
          subject: subject ? { _id: subject._id, name: subject.name } : null,
          mySubmission: subs[0] || null,
        };
      }));
    }

    res.json({
      success: true,
      dashboard: {
        totalStudents, totalTeachers, publishedResults, pendingResults,
        totalClasses, totalSubjects, currentTerm,
        currentAcademicYear: activeYear ? activeYear.name : '',
        averageMark: Math.round(avgMark * 100) / 100,
        passRate,
        recentResults: recentResultsPopulated,
        teacherResults, studentResults,
        feesStatus, latestNotices, upcomingEvents, recentAssignments,
        resultsHiddenMessage,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
