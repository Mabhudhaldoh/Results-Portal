const db = require("../config/database");

const CATEGORIES = ['general', 'holiday', 'sports', 'club', 'emergency'];

exports.getNotices = async (req, res) => {
  try {
    const { category } = req.query;
    let notices = await db.collection('notices').find({ isActive: true });
    if (category) notices = notices.filter(n => n.category === category);

    if (req.user.role === 'student') {
      const student = await db.collection('users').findById(req.user._id);
      notices = notices.filter(n => {
        if (n.audience === 'teachers') return false;
        if (n.audience === 'form') return !n.className || n.className === student?.className;
        return true;
      });
    } else if (req.user.role !== 'admin' && req.user.role !== 'headmaster') {
      notices = notices.filter(n => n.audience !== 'students');
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
    if (!title || !content) return res.status(400).json({ success: false, message: 'Title and content are required' });
    if (!CATEGORIES.includes(category)) return res.status(400).json({ success: false, message: 'Invalid category' });
    if (audience === 'form' && !className) return res.status(400).json({ success: false, message: 'Select a form/class for this notice' });
    let attachment = null;
    if (req.file) attachment = { url: '/uploads/' + req.file.filename, name: req.file.originalname, type: req.file.mimetype };
    const notice = await db.collection('notices').create({
      title, content, category, audience, priority, className: audience === 'form' ? className : null,
      attachment,
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
    const notice = await db.collection('notices').findById(req.params.id);
    if (!notice) return res.status(404).json({ success: false, message: 'Notice not found' });
    const newAudience = audience ?? notice.audience;
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
