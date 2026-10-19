const db = require("../config/database");

exports.getFeedback = async (req, res) => {
  try {
    let feedback;
    if (req.user.role === 'headmaster') {
      feedback = await db.collection('feedback').find({ sender: req.user._id });
    } else if (req.query.teacherId) {
      feedback = await db.collection('feedback').find({ teacherId: req.query.teacherId });
    } else {
      feedback = await db.collection('feedback').find({ teacherId: req.user._id });
    }
    feedback.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    feedback = await Promise.all(feedback.map(async f => {
      if (f.sender) f.sender = await db.collection('users').findById(f.sender) || null;
      if (f.teacherId && typeof f.teacherId === 'string') f.teacherId = await db.collection('users').findById(f.teacherId) || null;
      return f;
    }));
    res.json({ success: true, feedback });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createFeedback = async (req, res) => {
  try {
    const feedback = await db.collection('feedback').create({
      sender: req.user._id, teacherId: req.body.teacherId,
      subject: req.body.subject || '', message: req.body.message,
      priority: req.body.priority || 'normal', read: false,
    });
    res.status(201).json({ success: true, feedback });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.markRead = async (req, res) => {
  try {
    const fb = await db.collection('feedback').findById(req.params.id);
    if (!fb) return res.status(404).json({ success: false, message: 'Feedback not found' });
    fb.read = true;
    await db.collection('feedback').save(fb);
    res.json({ success: true, feedback: fb });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteFeedback = async (req, res) => {
  try {
    await db.collection('feedback').findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Feedback deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
