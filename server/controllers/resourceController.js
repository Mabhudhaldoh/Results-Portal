const db = require("../config/database");

const TYPES = ['note', 'pastpaper', 'syllabus', 'textbook', 'video', 'pptx', 'pdf', 'link'];

exports.getResources = async (req, res) => {
  try {
    const { type, subject } = req.query;
    let resources = await db.collection('resources').find();
    if (type) resources = resources.filter(r => r.type === type);
    if (subject) resources = resources.filter(r => r.subject === subject);
    resources = await Promise.all(resources.map(async r => {
      const sub = r.subject ? await db.collection('subjects').findById(r.subject) : null;
      const uploadedBy = r.uploadedBy ? await db.collection('users').findById(r.uploadedBy) : null;
      return {
        ...r,
        subject: sub ? { _id: sub._id, name: sub.name, code: sub.code } : (r.subject || null),
        uploadedBy: uploadedBy ? { _id: uploadedBy._id, firstName: uploadedBy.firstName, lastName: uploadedBy.lastName, role: uploadedBy.role } : null,
      };
    }));
    resources.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ success: true, resources });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createResource = async (req, res) => {
  try {
    const { title, type, subject, className, description, link } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });
    if (!TYPES.includes(type)) return res.status(400).json({ success: false, message: 'Invalid resource type' });

    let fileUrl = null;
    let fileName = null;
    if (req.file) {
      fileUrl = '/uploads/' + req.file.filename;
      fileName = req.file.originalname;
    }
    if (!fileUrl && !link) return res.status(400).json({ success: false, message: 'Provide a file or an external link' });

    const resource = await db.collection('resources').create({
      title, type, subject: subject || null, className: className || null,
      description: description || '', link: link || null, fileUrl, fileName,
      uploadedBy: req.user._id,
    });
    await db.collection('auditLogs').create({ user: req.user._id, action: 'CREATE_RESOURCE', target: resource._id, details: `Uploaded ${type}: ${title}` });
    res.status(201).json({ success: true, resource });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteResource = async (req, res) => {
  try {
    const resource = await db.collection('resources').findByIdAndDelete(req.params.id);
    if (!resource) return res.status(404).json({ success: false, message: 'Resource not found' });
    res.json({ success: true, message: 'Resource deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
