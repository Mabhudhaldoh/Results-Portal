const db = require("../config/database");

exports.getSubmissions = async (req, res) => {
  try {
    const { assignment, student } = req.query;
    const role = req.user.role;
    let submissions = await db.collection('submissions').find();

    if (assignment) submissions = submissions.filter(s => s.assignment === assignment);

    if (role === 'student') {
      submissions = submissions.filter(s => s.student === req.user._id);
    } else if (role === 'teacher') {
      if (!assignment) {
        const mine = await db.collection('assignments').find({ createdBy: req.user._id, isActive: true });
        const ids = mine.map(a => a._id);
        submissions = submissions.filter(s => ids.includes(s.assignment));
      }
    } else if (student) {
      submissions = submissions.filter(s => s.student === student);
    }

    submissions = await Promise.all(submissions.map(async s => {
      const stud = await db.collection('users').findById(s.student);
      const assign = s.assignment ? await db.collection('assignments').findById(s.assignment) : null;
      return {
        ...s,
        student: stud ? { _id: stud._id, firstName: stud.firstName, lastName: stud.lastName, admissionNumber: stud.admissionNumber } : { _id: s.student },
        assignment: assign ? { _id: assign._id, title: assign.title, dueDate: assign.dueDate, subject: assign.subject } : { _id: s.assignment },
      };
    }));

    submissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    res.json({ success: true, submissions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createSubmission = async (req, res) => {
  try {
    const { assignment, content } = req.body;
    if (!assignment) return res.status(400).json({ success: false, message: 'Assignment is required' });

    const assign = await db.collection('assignments').findById(assignment);
    if (!assign) return res.status(404).json({ success: false, message: 'Assignment not found' });

    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files.map(f => ({ fileUrl: '/uploads/' + f.filename, fileName: f.originalname }));
    }

    const submittedAt = new Date();
    const isLate = assign.dueDate ? submittedAt > new Date(assign.dueDate) : false;

    const existing = await db.collection('submissions').findOne({ assignment, student: req.user._id });
    let submission;
    if (existing) {
      submission = await db.collection('submissions').findByIdAndUpdate(existing._id, {
        content: content ?? existing.content,
        attachments: attachments.length > 0 ? [...(existing.attachments || []), ...attachments] : existing.attachments,
        submittedAt,
        isLate,
        status: 'submitted',
      });
    } else {
      submission = await db.collection('submissions').create({
        assignment, student: req.user._id, content: content || '', attachments,
        submittedAt, isLate, status: isLate ? 'late' : 'submitted',
      });
    }

    res.status(201).json({ success: true, submission });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.gradeSubmission = async (req, res) => {
  try {
    const { mark, feedback } = req.body;
    if (mark === undefined || mark === '') return res.status(400).json({ success: false, message: 'Mark is required' });
    const submission = await db.collection('submissions').findById(req.params.id);
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });
    const updated = await db.collection('submissions').findByIdAndUpdate(req.params.id, {
      mark: Number(mark),
      feedback: feedback || '',
      status: 'graded',
      gradedBy: req.user._id,
      gradedAt: new Date(),
    });
    res.json({ success: true, submission: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteSubmission = async (req, res) => {
  try {
    const submission = await db.collection('submissions').findByIdAndDelete(req.params.id);
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });
    res.json({ success: true, message: 'Submission deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
