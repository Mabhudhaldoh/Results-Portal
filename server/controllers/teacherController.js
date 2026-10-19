const db = require("../config/database");
const bcrypt = require('bcryptjs');

exports.getTeachers = async (req, res) => {
  try {
    const { search } = req.query;
    let teachers = await db.collection('users').find({ role: 'teacher' });

    if (search) {
      const s = search.toLowerCase();
      teachers = teachers.filter(t =>
        (t.firstName && t.firstName.toLowerCase().includes(s)) ||
        (t.lastName && t.lastName.toLowerCase().includes(s)) ||
        (t.employeeNumber && t.employeeNumber.toLowerCase().includes(s)) ||
        (t.email && t.email.toLowerCase().includes(s))
      );
    }

    teachers = await Promise.all(teachers.map(async t => {
      const { password, ...rest } = t;
      rest.assignedSubjects = (await Promise.all((rest.assignedSubjects || []).map(id => db.collection('subjects').findById(id)))).filter(Boolean);
      rest.assignedClasses = (await Promise.all((rest.assignedClasses || []).map(id => db.collection('classes').findById(id)))).filter(Boolean);
      return rest;
    }));

    res.json({ success: true, teachers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createTeacher = async (req, res) => {
  try {
    const { password, ...rest } = req.body;
    const hashedPassword = await bcrypt.hash(password || 'teacher123', 10);
    const teacher = await db.collection('users').create({ ...rest, password: hashedPassword, role: 'teacher', isActive: true });
    const { password: _, ...safeTeacher } = teacher;
    res.status(201).json({ success: true, teacher: safeTeacher });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
