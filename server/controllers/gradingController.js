const db = require("../config/database");

exports.getGradings = async (req, res) => {
  try {
    let gradings = await db.collection('gradings').find();
    gradings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ success: true, gradings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createGrading = async (req, res) => {
  try {
    if (req.body.isActive) {
      const existing = await db.collection('gradings').find();
      for (const g of existing) { g.isActive = false; await db.collection('gradings').save(g); }
    }
    const grading = await db.collection('gradings').create(req.body);
    res.status(201).json({ success: true, grading });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateGrading = async (req, res) => {
  try {
    const grading = await db.collection('gradings').findByIdAndUpdate(req.params.id, req.body);
    if (!grading) return res.status(404).json({ success: false, message: 'Grading system not found' });
    res.json({ success: true, grading });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteGrading = async (req, res) => {
  try {
    await db.collection('gradings').findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Grading system deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.applyGrading = async (req, res) => {
  try {
    const grading = await db.collection('gradings').findById(req.params.id);
    if (!grading) return res.status(404).json({ success: false, message: 'Grading system not found' });
    const results = await db.collection('results').find();
    for (const r of results) {
      const level = grading.levels.find(l => r.finalMark >= l.minMark && r.finalMark <= l.maxMark);
      if (level) {
        r.grade = level.grade;
        r.points = level.points;
        r.gradeRemark = level.remark || '';
        await db.collection('results').save(r);
      }
    }
    res.json({ success: true, message: 'Grading applied to all results' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
