const db = require("../config/database");

exports.getAcademicYears = async (req, res) => {
  try {
    let years = await db.collection('academicYears').find();
    years.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    res.json({ success: true, years });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createAcademicYear = async (req, res) => {
  try {
    const year = await db.collection('academicYears').create(req.body);
    res.status(201).json({ success: true, year });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateAcademicYear = async (req, res) => {
  try {
    const year = await db.collection('academicYears').findByIdAndUpdate(req.params.id, req.body);
    if (!year) return res.status(404).json({ success: false, message: 'Academic year not found' });
    res.json({ success: true, year });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteAcademicYear = async (req, res) => {
  try {
    await db.collection('academicYears').findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Academic year deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.setActiveYear = async (req, res) => {
  try {
    const years = await db.collection('academicYears').find();
    for (const y of years) { y.isActive = false; await db.collection('academicYears').save(y); }
    const year = await db.collection('academicYears').findById(req.params.id);
    if (year) { year.isActive = true; await db.collection('academicYears').save(year); }
    res.json({ success: true, message: 'Active year set' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addTerm = async (req, res) => {
  try {
    const year = await db.collection('academicYears').findById(req.params.id);
    if (!year) return res.status(404).json({ success: false, message: 'Academic year not found' });
    year.terms = year.terms || [];
    year.terms.push({ _id: require('uuid').v4(), ...req.body });
    await db.collection('academicYears').save(year);
    res.json({ success: true, year });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.setActiveTerm = async (req, res) => {
  try {
    const year = await db.collection('academicYears').findById(req.params.yearId);
    if (!year) return res.status(404).json({ success: false, message: 'Academic year not found' });
    (year.terms || []).forEach(t => t.isActive = false);
    const term = (year.terms || []).find(t => t._id === req.params.termId);
    if (term) term.isActive = true;
    await db.collection('academicYears').save(year);
    res.json({ success: true, year });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
