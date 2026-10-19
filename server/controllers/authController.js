const db = require("../config/database");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

exports.login = async (req, res) => {
  try {
    const { email, password, admissionNumber } = req.body;
    let user;
    if (admissionNumber) {
      user = await db.collection('users').findOne({ admissionNumber });
    } else if (email) {
      user = await db.collection('users').findOne({ email: email.toLowerCase() });
    } else {
      return res.status(400).json({ success: false, message: 'Please provide email or admission number' });
    }
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is disabled. Contact administrator.' });
    }
    if (user.accountExpiresAt && new Date(user.accountExpiresAt) < new Date()) {
      return res.status(403).json({ success: false, message: 'Account access has expired. Contact administrator.' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    user.lastLogin = new Date().toISOString();
    await db.collection('users').save(user);

    await db.collection('auditLogs').create({ user: user._id, action: 'LOGIN', details: `${user.firstName} ${user.lastName} logged in` });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
    res.json({
      success: true, token,
      user: {
        id: user._id, email: user.email, role: user.role,
        firstName: user.firstName, lastName: user.lastName, photo: user.photo,
        admissionNumber: user.admissionNumber, employeeNumber: user.employeeNumber,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await db.collection('users').findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const populate = async (doc) => {
      if (doc.className) doc.className = await db.collection('classes').findById(doc.className) || doc.className;
      if (doc.stream) doc.stream = await db.collection('streams').findById(doc.stream) || doc.stream;
      if (doc.classTeacher) doc.classTeacher = await db.collection('classes').findById(doc.classTeacher) || doc.classTeacher;
      if (doc.assignedClasses) doc.assignedClasses = (await Promise.all(doc.assignedClasses.map(id => db.collection('classes').findById(id))))?.filter(Boolean);
      if (doc.assignedSubjects) doc.assignedSubjects = (await Promise.all(doc.assignedSubjects.map(id => db.collection('subjects').findById(id))))?.filter(Boolean);
      return doc;
    };

    res.json({ success: true, user: await populate({ ...user }) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const user = await db.collection('users').findById(req.user._id);
    const { currentPassword, newPassword } = req.body;
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }
    user.password = await bcrypt.hash(newPassword, 10);
    await db.collection('users').save(user);
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
    res.json({ success: true, token, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.registerAdmin = async (req, res) => {
  try {
    const existingAdmin = await db.collection('users').findOne({ role: 'admin' });
    if (existingAdmin) {
      return res.status(400).json({ success: false, message: 'Admin account already exists' });
    }
    const { email, password, firstName, lastName, phone } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await db.collection('users').create({ email, password: hashedPassword, firstName, lastName, phone, role: 'admin', isActive: true });
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
    res.status(201).json({ success: true, token, user: { id: user._id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
