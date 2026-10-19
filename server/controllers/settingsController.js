const db = require("../config/database");

exports.getSettings = async (req, res) => {
  try {
    let settingsArr = await db.collection('settings').find();
    let settings = settingsArr[0];
    if (!settings) {
      settings = await db.collection('settings').create({
        schoolName: "Martin Luther King Jnr. Family of Schools",
        schoolMotto: "Excellence in Education",
      });
    }
    if (settings.currentAcademicYear) {
      settings.currentAcademicYear = await db.collection('academicYears').findById(settings.currentAcademicYear) || null;
    }
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    let settingsArr = await db.collection('settings').find();
    let settings = settingsArr[0];
    if (!settings) {
      settings = await db.collection('settings').create(req.body);
    } else {
      Object.assign(settings, req.body);
      await db.collection('settings').save(settings);
    }
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
