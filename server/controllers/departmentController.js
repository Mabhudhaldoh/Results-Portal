const db = require("../config/database");

exports.getDepartments = async (req, res) => {
  try {
    const departments = await db.collection('departments').find();
    for (const d of departments) {
      if (d.head) d.head = await db.collection('users').findById(d.head) || null;
    }
    res.json({ success: true, departments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createDepartment = async (req, res) => {
  try {
    const department = await db.collection('departments').create(req.body);
    res.status(201).json({ success: true, department });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const department = await db.collection('departments').findByIdAndUpdate(req.params.id, req.body);
    if (!department) return res.status(404).json({ success: false, message: 'Department not found' });
    res.json({ success: true, department });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    await db.collection('departments').findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Department deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
