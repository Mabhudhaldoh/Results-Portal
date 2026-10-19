const db = require("../config/database");

exports.getSubjects = async (req, res) => {
  try {
    const { category } = req.query;
    let subjects = await db.collection('subjects').find();
    if (category) subjects = subjects.filter(s => s.category === category);
    subjects = await Promise.all(subjects.map(async s => {
      s.teachers = (await Promise.all((s.teachers || []).map(async id => {
        const t = await db.collection('users').findById(id);
        return t ? { _id: t._id, firstName: t.firstName, lastName: t.lastName } : null;
      }))).filter(Boolean);
      if (s.department) s.department = await db.collection('departments').findById(s.department) || null;
      return s;
    }));
    res.json({ success: true, subjects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createSubject = async (req, res) => {
  try {
    const subject = await db.collection('subjects').create(req.body);
    res.status(201).json({ success: true, subject });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateSubject = async (req, res) => {
  try {
    const subject = await db.collection('subjects').findByIdAndUpdate(req.params.id, req.body);
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
    res.json({ success: true, subject });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteSubject = async (req, res) => {
  try {
    await db.collection('subjects').findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Subject deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
