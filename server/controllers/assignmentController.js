const db = require("../config/database");

exports.getAssignments = async (req, res) => {
  try {
    const role = req.user.role;
    let assignments = await db.collection('assignments').find({ isActive: true });

    if (role === 'student') {
      const u = await db.collection('users').findById(req.user._id);
      const className = u?.className;
      const stream = u?.stream;
      assignments = assignments.filter(a => !className || a.className === className || !a.className);
      assignments = assignments.filter(a => !stream || !a.stream || a.stream === stream);
    } else if (role === 'teacher' && req.query.mine === 'true') {
      assignments = assignments.filter(a => a.createdBy === req.user._id);
    }

    assignments = await Promise.all(assignments.map(async a => {
      const subject = a.subject ? await db.collection('subjects').findById(a.subject) : null;
      const creator = a.createdBy ? await db.collection('users').findById(a.createdBy) : null;
      const subCount = await db.collection('submissions').countDocuments({ assignment: a._id });
      let mySubmission = null;
      if (role === 'student') {
        const subs = await db.collection('submissions').find({ assignment: a._id, student: req.user._id });
        mySubmission = subs[0] || null;
      }
      return {
        ...a,
        subject: subject ? { _id: subject._id, name: subject.name, code: subject.code } : null,
        createdBy: creator ? { _id: creator._id, firstName: creator.firstName, lastName: creator.lastName } : null,
        submissionCount: subCount,
        mySubmission,
      };
    }));

    assignments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ success: true, assignments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAssignment = async (req, res) => {
  try {
    const assignment = await db.collection('assignments').findById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    const subject = assignment.subject ? await db.collection('subjects').findById(assignment.subject) : null;
    const creator = assignment.createdBy ? await db.collection('users').findById(assignment.createdBy) : null;
    const className = assignment.className ? await db.collection('classes').findById(assignment.className) : null;
    const stream = assignment.stream ? await db.collection('streams').findById(assignment.stream) : null;
    const submissions = await db.collection('submissions').find({ assignment: assignment._id });
    const subCount = submissions.length;
    const gradedCount = submissions.filter(s => s.status === 'graded').length;
    const lateCount = submissions.filter(s => s.isLate).length;
    res.json({
      success: true,
      assignment: {
        ...assignment,
        subject: subject ? { _id: subject._id, name: subject.name, code: subject.code } : null,
        createdBy: creator ? { _id: creator._id, firstName: creator.firstName, lastName: creator.lastName } : null,
        className: className ? { _id: className._id, name: className.name } : null,
        stream: stream ? { _id: stream._id, name: stream.name } : null,
        submissionCount: subCount,
        gradedCount,
        lateCount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createAssignment = async (req, res) => {
  try {
    const { title, description, subject, className, stream, dueDate } = req.body;
    if (!title || !subject || !dueDate) return res.status(400).json({ success: false, message: 'Title, subject and due date are required' });

    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files.map(f => ({ fileUrl: '/uploads/' + f.filename, fileName: f.originalname }));
    }

    const assignment = await db.collection('assignments').create({
      title, description: description || '', subject, className: className || null, stream: stream || null,
      dueDate, attachments, createdBy: req.user._id, isActive: true,
    });
    await db.collection('auditLogs').create({ user: req.user._id, action: 'CREATE_ASSIGNMENT', target: assignment._id, details: `Created assignment: ${title}` });
    res.status(201).json({ success: true, assignment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateAssignment = async (req, res) => {
  try {
    const assignment = await db.collection('assignments').findById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    if (assignment.createdBy !== req.user._id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You can only update your own assignments' });
    }
    const { title, description, subject, className, stream, dueDate, isActive } = req.body;
    let attachments = assignment.attachments || [];
    if (req.files && req.files.length > 0) {
      attachments = [...attachments, ...req.files.map(f => ({ fileUrl: '/uploads/' + f.filename, fileName: f.originalname }))];
    }
    const updated = await db.collection('assignments').findByIdAndUpdate(req.params.id, {
      title: title ?? assignment.title,
      description: description ?? assignment.description,
      subject: subject ?? assignment.subject,
      className: className !== undefined ? className : assignment.className,
      stream: stream !== undefined ? stream : assignment.stream,
      dueDate: dueDate ?? assignment.dueDate,
      isActive: isActive !== undefined ? isActive : assignment.isActive,
      attachments,
    });
    res.json({ success: true, assignment: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteAssignment = async (req, res) => {
  try {
    const assignment = await db.collection('assignments').findById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    if (assignment.createdBy !== req.user._id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You can only delete your own assignments' });
    }
    await db.collection('assignments').findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Assignment deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
