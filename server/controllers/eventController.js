const db = require("../config/database");
const { storeUploadedFile } = require("../utils/fileStorage");
const MANAGERS = ['admin', 'headmaster', 'finance'];

exports.getEventRecipients = async (req, res) => {
  try {
    const users = await db.collection('users').find({});
    const recipients = users
      .filter(u => u.isActive !== false && ['student', 'teacher', 'finance', 'headmaster', 'admin'].includes(u.role))
      .map(u => ({ _id: u._id, firstName: u.firstName || '', lastName: u.lastName || '', role: u.role, admissionNumber: u.admissionNumber || '' }));
    res.json({ success: true, recipients });
  } catch (error) {
    console.error('Event operation failed:', error);
    res.status(500).json({ success: false, message: error.message || 'Unable to save event. Please try again.' });
  }
};

exports.getEvents = async (req, res) => {
  try {
    const { upcoming } = req.query;
    let events = await db.collection('events').find();
    events.sort((a, b) => new Date(a.date) - new Date(b.date));
    if (req.user.role === 'student') {
      events = events.filter(e => e.audience !== 'teachers' && (e.audience !== 'selected' || (e.recipientIds || []).includes(req.user._id)));
    } else if (!MANAGERS.includes(req.user.role)) {
      events = events.filter(e => e.audience !== 'students' && (e.audience !== 'selected' || (e.recipientIds || []).includes(req.user._id)));
    }
    if (upcoming === 'true') {
      const now = new Date();
      events = events.filter(e => new Date(e.date) >= new Date(now.getFullYear(), now.getMonth(), now.getDate()));
    }
    res.json({ success: true, events });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createEvent = async (req, res) => {
  try {
    const { title, description, date, time, location, category = 'other', audience = 'all' } = req.body;
    let recipientIds = req.body.recipientIds || [];
    if (typeof recipientIds === 'string') { try { recipientIds = JSON.parse(recipientIds); } catch { recipientIds = []; } }
    if (!Array.isArray(recipientIds)) recipientIds = [];
    if (!title || !date) return res.status(400).json({ success: false, message: 'Title and date are required' });
    if (!['all', 'students', 'teachers', 'selected'].includes(audience)) return res.status(400).json({ success: false, message: 'Invalid audience' });
    if (audience === 'selected' && recipientIds.length === 0) return res.status(400).json({ success: false, message: 'Select at least one recipient' });
    const attachment = req.file ? await storeUploadedFile(req.file) : null;
    const event = await db.collection('events').create({
      title, description: description || '', date, time: time || '', location: location || '', category,
      audience, recipientIds: audience === 'selected' ? recipientIds : [], attachment,
      createdBy: req.user._id, createdByName: `${req.user.firstName} ${req.user.lastName}`,
    });
    try {
      await db.collection('auditLogs').create({ user: req.user._id, action: 'CREATE_EVENT', target: event._id, details: `Created event: ${title}` });
    } catch (auditError) {
      console.error('Event saved, but audit log failed:', auditError.message);
    }
    res.status(201).json({ success: true, event, message: 'Event published successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const event = await db.collection('events').findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    const { title, description, date, time, location, category, audience } = req.body;
    let recipientIds = req.body.recipientIds;
    if (typeof recipientIds === 'string') { try { recipientIds = JSON.parse(recipientIds); } catch { recipientIds = []; } }
    if (recipientIds !== undefined && !Array.isArray(recipientIds)) recipientIds = [];
    const attachment = req.file ? await storeUploadedFile(req.file) : (event.attachment || null);
    const newAudience = audience ?? event.audience ?? 'all';
    const newRecipientIds = newAudience === 'selected' ? (recipientIds ?? event.recipientIds ?? []) : [];
    if (!['all', 'students', 'teachers', 'selected'].includes(newAudience)) return res.status(400).json({ success: false, message: 'Invalid audience' });
    if (newAudience === 'selected' && newRecipientIds.length === 0) return res.status(400).json({ success: false, message: 'Select at least one recipient' });
    const updated = await db.collection('events').findByIdAndUpdate(req.params.id, {
      title: title ?? event.title,
      description: description ?? event.description,
      date: date ?? event.date,
      time: time ?? event.time,
      location: location ?? event.location,
      category: category ?? event.category,
      audience: newAudience,
      recipientIds: newRecipientIds,
      attachment,
    });
    res.json({ success: true, event: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const event = await db.collection('events').findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, message: 'Event deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
