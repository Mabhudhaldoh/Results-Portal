const db = require("../config/database");

exports.getEvents = async (req, res) => {
  try {
    const { upcoming } = req.query;
    let events = await db.collection('events').find();
    events.sort((a, b) => new Date(a.date) - new Date(b.date));
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
    const { title, description, date, time, location, category = 'other' } = req.body;
    if (!title || !date) return res.status(400).json({ success: false, message: 'Title and date are required' });
    let attachment = null;
    if (req.file) attachment = { url: '/uploads/' + req.file.filename, name: req.file.originalname, type: req.file.mimetype };
    const event = await db.collection('events').create({
      title, description: description || '', date, time: time || '', location: location || '', category,
      attachment,
      createdBy: req.user._id, createdByName: `${req.user.firstName} ${req.user.lastName}`,
    });
    await db.collection('auditLogs').create({ user: req.user._id, action: 'CREATE_EVENT', target: event._id, details: `Created event: ${title}` });
    res.status(201).json({ success: true, event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const event = await db.collection('events').findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    const { title, description, date, time, location, category } = req.body;
    let attachment = event.attachment || null;
    if (req.file) attachment = { url: '/uploads/' + req.file.filename, name: req.file.originalname, type: req.file.mimetype };
    const updated = await db.collection('events').findByIdAndUpdate(req.params.id, {
      title: title ?? event.title,
      description: description ?? event.description,
      date: date ?? event.date,
      time: time ?? event.time,
      location: location ?? event.location,
      category: category ?? event.category,
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
