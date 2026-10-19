const db = require("../config/database");

exports.getResultsVisibility = async (now = new Date()) => {
  const settingsArr = await db.collection('settings').find();
  const settings = settingsArr[0] || {};
  const v = settings.resultsVisibility;
  if (!v || v.enabled === false) return { visible: true };

  const from = v.from ? new Date(v.from) : null;
  const to = v.to ? new Date(v.to) : null;

  if (from && !isNaN(from) && now < from) {
    return { visible: false, message: 'Results will be available from ' + from.toLocaleString() };
  }
  if (to && !isNaN(to) && now > to) {
    return { visible: false, message: 'Results are temporarily unavailable. The viewing window has closed.' };
  }
  return { visible: true };
};
