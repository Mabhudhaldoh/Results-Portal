const multer = require('multer');

// Vercel's deployment filesystem is read-only. Keep uploads in memory and
// persist them to MongoDB GridFS from the notice/event controllers.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
});

module.exports = upload;
