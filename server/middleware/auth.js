const jwt = require('jsonwebtoken');
const db = require('../config/database');

exports.protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await db.collection('users').findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is disabled' });
    }
    if (user.accountExpiresAt && new Date(user.accountExpiresAt) < new Date()) {
      return res.status(403).json({ success: false, message: 'Account access has expired. Contact administrator.' });
    }
    const { password, ...safeUser } = user;
    req.user = safeUser;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: `Role ${req.user.role} is not authorized to access this route` });
    }
    next();
  };
};
