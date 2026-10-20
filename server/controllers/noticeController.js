const db = require("../config/database");

const CATEGORIES = ['general', 'holiday', 'sports', 'club', 'emergency'];
const MANAGERS = ['admin', 'headmaster', 'finance'];

exports.getNoticeRecipients = async (req, res) => {
  try {
    const users = await db.collection('users').find({ isActive: true });
    const recipients = await Promise.all(users
      .filter(u => ['student', 'teacher', 'finance', 'headmaster', 'admin'].includes(u.role))
      .map(async u => {
        const cls = u.className ? await db.collection('classes').findById(u.className) : null;
        return { _id: u._id, firstName: u.firstName || '', lastName: u.lastName || '', role: u.role, admissionNumber: u.admissionNumber || '', className: cls?.name || '' };
      }));
    res.json({ success: true, recipients });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getNotices = async (req, res) => {
  try {
    const { category } = req.query;
    let notices = await db.collection('notices').find({ isActive: true });
    if (category) notices = notices.filter(n => n.category === category);

    if (req.user.role === 'student') {
      const student = await db.collection('users').findById(req.user._id);
      notices = notices.filter(n => {
        if (n.audience === 'teachers') return false;
        if (n.audience === 'selected') return (n.recipientIds || []).includes(req.user._id);
        if (n.audience === 'form') return !n.className || n.className === student?.className;
        return true;
      });
    } else if (!MANAGERS.includes(req.user.role)) {
      notices = notices.filter(n => n.audience !== 'students' && (n.audience !== 'selected' || (n.recipientIds || []).includes(req.user._id)));
    }

    notices = await Promise.all(notices.map(async n => {
      if (n.className && typeof n.className === 'string') {
        const cls = await db.collection('classes').findById(n.className);
        if (cls) n = { ...n, className: { _id: cls._id, name: cls.name } };
      }
      return n;
    }));

    notices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ success: true, notices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createNotice = async (req, res) => {
  try {
    const { title, content, category = 'general', audience = 'all', priority = 'normal', className } = req.body;
    let recipientIds = req.body.recipientIds || [];
    if (typeof recipientIds === 'string') { try { recipientIds = JSON.parse(recipientIds); } catch { recipientIds = []; } }
    if (!Array.isArray(recipientIds)) recipientIds = [];
    if (!title || !content) return res.status(400).json({ success: false, message: 'Title and content are required' });
    if (!CATEGORIES.includes(category)) return res.status(400).json({ success: false, message: 'Invalid category' });
    if (audience === 'form' && !className) return res.status(400).json({ success: false, message: 'Select a form/class for this notice' });
    if (audience === 'selected' && recipientIds.length === 0) return res.status(400).json({ success: false, message: 'Select at least one recipient' });
    let attachment = null;
    if (req.file) attachment = { url: '/uploads/' + req.file.filename, name: req.file.originalname, type: req.file.mimetype };
    const notice = await db.collection('notices').create({
      title, content, category, audience, priority, className: audience === 'form' ? className : null,
      recipientIds: audience === 'selected' ? recipientIds : [], attachment,
      createdBy: req.user._id, createdByName: `${req.user.firstName} ${req.user.lastName}`, isActive: true,
    });
    await db.collection('auditLogs').create({ user: req.user._id, action: 'CREATE_NOTICE', target: notice._id, details: `Created ${category} notice: ${title}` });
    res.status(201).json({ success: true, notice });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateNotice = async (req, res) => {
  try {
    const { title, content, category, audience, priority, isActive, className } = req.body;
    let recipientIds = req.body.recipientIds;
    if (typeof recipientIds === 'string') { try { recipientIds = JSON.parse(recipientIds); } catch { recipientIds = []; } }
    if (recipientIds !== undefined && !Array.isArray(recipientIds)) recipientIds = [];
    const notice = await db.collection('notices').findById(req.params.id);
    if (!notice) return res.status(404).json({ success: false, message: 'Notice not found' });
    const newAudience = audience ?? notice.audience;
    if (newAudience === 'selected' && !(recipientIds || notice.recipientIds || []).length) {
      return res.status(400).json({ success: false, message: 'Select at least one recipient' });
    }
    if (newAudience === 'form' && !className) {
      return res.status(400).json({ success: false, message: 'Select a form/class for this notice' });
    }
    let attachment = notice.attachment || null;
    if (req.file) attachment = { url: '/uploads/' + req.file.filename, name: req.file.originalname, type: req.file.mimetype };
    const updated = await db.collection('notices').findByIdAndUpdate(req.params.id, {
      title: title ?? notice.title,
      content: content ?? notice.content,
      category: category ?? notice.category,
      audience: newAudience,
      priority: priority ?? notice.priority,
      isActive: isActive !== undefined ? isActive : notice.isActive,
      className: newAudience === 'form' ? (className ?? notice.className) : null,
      recipientIds: newAudience === 'selected' ? (recipientIds ?? notice.recipientIds ?? []) : [],
      attachment,
    });
    res.json({ success: true, notice: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteNotice = async (req, res) => {
  try {
    const notice = await db.collection('notices').findByIdAndDelete(req.params.id);
    if (!notice) return res.status(404).json({ success: false, message: 'Notice not found' });
    res.json({ success: true, message: 'Notice deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
