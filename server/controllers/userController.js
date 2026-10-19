const db = require("../config/database");
const bcrypt = require('bcryptjs');

exports.getUsers = async (req, res) => {
  try {
    const { role, search, page = 1, limit = 50 } = req.query;
    let query = {};
    if (role) query.role = role;

    let users = await db.collection('users').find(query);

    if (search) {
      const s = search.toLowerCase();
      users = users.filter(u =>
        (u.firstName && u.firstName.toLowerCase().includes(s)) ||
        (u.lastName && u.lastName.toLowerCase().includes(s)) ||
        (u.email && u.email.toLowerCase().includes(s)) ||
        (u.admissionNumber && u.admissionNumber.toLowerCase().includes(s)) ||
        (u.employeeNumber && u.employeeNumber.toLowerCase().includes(s))
      );
    }

    users = await Promise.all(users.map(async u => {
      const { password, ...rest } = u;
      if (rest.className) rest.className = await db.collection('classes').findById(rest.className) || rest.className;
      if (rest.stream) rest.stream = await db.collection('streams').findById(rest.stream) || rest.stream;
      if (rest.assignedSubjects) rest.assignedSubjects = (await Promise.all(rest.assignedSubjects.map(id => db.collection('subjects').findById(id)))).filter(Boolean);
      if (rest.assignedClasses) rest.assignedClasses = (await Promise.all(rest.assignedClasses.map(id => db.collection('classes').findById(id)))).filter(Boolean);
      return rest;
    }));

    const total = users.length;
    const start = (page - 1) * limit;
    users = users.slice(start, start + parseInt(limit));

    res.json({ success: true, users, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { password, accountExpiresAt, ...rest } = req.body;
    const hashedPassword = await bcrypt.hash(password || 'password123', 10);
    let defaultFee = 0;
    if (rest.role === 'student' && !rest.feesRequired) {
      const s = (await db.collection('settings').find())[0];
      defaultFee = s?.defaultFeesRequired || 0;
    }
    const expiry = accountExpiresAt ? new Date(accountExpiresAt) : null;
    const user = await db.collection('users').create({ ...rest, password: hashedPassword, isActive: true, accountExpiresAt: expiry, feesRequired: rest.feesRequired ?? defaultFee, feesPaid: rest.feesPaid ?? 0, feesBalance: (rest.feesRequired ?? defaultFee) - (rest.feesPaid ?? 0) });
    await db.collection('auditLogs').create({ user: req.user._id, action: 'CREATE_USER', target: user._id, details: `Created ${user.role}: ${user.firstName} ${user.lastName}` });
    const { password: _, ...safeUser } = user;
    res.status(201).json({ success: true, user: safeUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { password, accountExpiresAt, ...updateData } = req.body;
    if (updateData.role) updateData.role = updateData.role;
    const expiry = accountExpiresAt ? new Date(accountExpiresAt) : null;
    if (accountExpiresAt !== undefined) updateData.accountExpiresAt = expiry;
    const user = await db.collection('users').findByIdAndUpdate(req.params.id, updateData);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    await db.collection('auditLogs').create({ user: req.user._id, action: 'UPDATE_USER', target: user._id, details: `Updated ${user.role}: ${user.firstName} ${user.lastName}` });
    const { password: _, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await db.collection('users').findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    await db.collection('auditLogs').create({ user: req.user._id, action: 'DELETE_USER', target: req.params.id, details: `Deleted ${user.role}: ${user.firstName} ${user.lastName}` });
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.bulkUpdateUsers = async (req, res) => {
  try {
    const { ids, updates } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ success: false, message: 'ids array required' });
    if (!updates || typeof updates !== 'object') return res.status(400).json({ success: false, message: 'updates object required' });
    let updated = 0;
    for (const id of ids) {
      const user = await db.collection('users').findById(id);
      if (!user) continue;
      const patch = { ...updates };
      if ('feesRequired' in patch || 'feesPaid' in patch) {
        const reqF = patch.feesRequired ?? user.feesRequired ?? 0;
        const paid = patch.feesPaid ?? user.feesPaid ?? 0;
        patch.feesBalance = reqF - paid;
      }
      await db.collection('users').findByIdAndUpdate(id, patch);
      updated++;
    }
    await db.collection('auditLogs').create({ user: req.user._id, action: 'BULK_UPDATE_USERS', details: `Bulk updated ${updated} users` });
    res.json({ success: true, updated, message: `${updated} students updated` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.bulkDeleteUsers = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ success: false, message: 'ids array required' });
    let deleted = 0;
    for (const id of ids) {
      const user = await db.collection('users').findById(id);
      if (!user || user.role !== 'student') continue;
      await db.collection('users').findByIdAndDelete(id);
      await db.collection('results').deleteMany({ student: id });
      deleted++;
    }
    await db.collection('auditLogs').create({ user: req.user._id, action: 'BULK_DELETE_USERS', details: `Bulk deleted ${deleted} students` });
    res.json({ success: true, deleted, message: `${deleted} students deleted` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const user = await db.collection('users').findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.password = await bcrypt.hash(req.body.password || 'password123', 10);
    await db.collection('users').save(user);
    await db.collection('auditLogs').create({ user: req.user._id, action: 'RESET_PASSWORD', target: user._id, details: `Reset password for ${user.firstName} ${user.lastName}` });
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.toggleActive = async (req, res) => {
  try {
    const user = await db.collection('users').findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isActive = !user.isActive;
    await db.collection('users').save(user);
    res.json({ success: true, user, message: `Account ${user.isActive ? 'enabled' : 'disabled'}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.assignSubjects = async (req, res) => {
  try {
    const user = await db.collection('users').findByIdAndUpdate(req.params.id, { assignedSubjects: req.body.subjects });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.assignClasses = async (req, res) => {
  try {
    const user = await db.collection('users').findByIdAndUpdate(req.params.id, { assignedClasses: req.body.classes, classTeacher: req.body.classTeacher });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.assignStudents = async (req, res) => {
  try {
    const user = await db.collection('users').findByIdAndUpdate(req.params.id, { assignedStudents: req.body.students });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
