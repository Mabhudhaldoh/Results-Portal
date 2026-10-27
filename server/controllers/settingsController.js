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
      settings = await db.collection('settings').create({
        schoolName: "Martin Luther King Jnr. Family of Schools",
        schoolMotto: "Excellence in Education",
      });
    }

    if (req.user.role === 'headmaster') {
      if (Object.prototype.hasOwnProperty.call(req.body, 'headmasterSignature')) {
        const signature = req.body.headmasterSignature;
        if (signature !== null && signature !== '' && (typeof signature !== 'string' || !/^data:image\\/(png|jpeg|webp);base64,/.test(signature) || signature.length > 1400000)) {
          return res.status(400).json({ success: false, message: 'Upload a transparent PNG or JPEG signature under 1 MB.' });
        }
        settings.headmasterSignature = signature || null;
      } else {
        return res.status(403).json({ success: false, message: 'Headmaster accounts may only update the report-card signature here.' });
      }
    } else if (req.user.role === 'finance') {
      const allowed = ['defaultFeesRequired', 'feesViewPercentage', 'feesBlockingEnabled'];
      for (const key of allowed) {
        if (Object.prototype.hasOwnProperty.call(req.body, key)) settings[key] = req.body[key];
      }
    } else {
      Object.assign(settings, req.body);
    }

    await db.collection('settings').save(settings);
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
