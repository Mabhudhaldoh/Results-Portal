const express = require('express');
require('express-async-errors');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: __dirname + '/.env' });

const { connectDB } = require('./config/db');

const app = express();

// Trust the single proxy hop used by Vercel so express-rate-limit can read client IPs.
app.set('trust proxy', 1);


// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(morgan('dev'));

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));


// Connect to MongoDB before API handlers run; the promise is reused on warm instances.
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('MongoDB connection unavailable:', error.message);
    res.status(503).json({ success: false, message: 'Database temporarily unavailable. Please try again.' });
  }
});

// Rate Limiting
const limiter = rateLimit({

  windowMs: 15 * 60 * 1000,

  max: 500,

  message: 'Too many requests, please try again later.'

});


app.use('/api', limiter);


// Persistent attachment downloads stored in MongoDB GridFS (not the read-only Vercel filesystem).
app.get('/api/uploads/:id', async (req, res) => {
  try {
    const { ObjectId, GridFSBucket } = require('mongodb');
    if (!ObjectId.isValid(req.params.id)) return res.status(404).json({ success: false, message: 'Attachment not found' });
    const database = require('./config/db').getDB();
    const bucket = new GridFSBucket(database, { bucketName: 'portalUploads' });
    const fileId = new ObjectId(req.params.id);
    const files = await bucket.find({ _id: fileId }).limit(1).toArray();
    if (!files.length) return res.status(404).json({ success: false, message: 'Attachment not found' });
    const file = files[0];
    const contentType = file.metadata?.contentType || file.contentType || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline; filename="' + String(file.metadata?.originalName || file.filename || 'attachment').replace(/[^a-zA-Z0-9._-]/g, '_') + '"');
    res.setHeader('Cache-Control', 'private, max-age=300');
    const stream = bucket.openDownloadStream(fileId);
    stream.on('error', error => {
      console.error('Attachment download failed:', error.message);
      if (!res.headersSent) res.status(404).end('Attachment not found');
      else res.end();
    });
    stream.pipe(res);
  } catch (error) {
    console.error('Attachment route failed:', error.message);
    if (!res.headersSent) res.status(500).json({ success: false, message: 'Unable to load attachment' });
  }
});

// Static Files
app.use('/uploads', express.static(
  path.join(__dirname, 'uploads')
));

const publicDir = path.join(__dirname, '..', 'public');
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (require('fs').existsSync(clientDist) && process.env.VERCEL !== '1') {
  app.use(express.static(clientDist));
}


// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/students', require('./routes/students'));
app.use('/api/teachers', require('./routes/teachers'));
app.use('/api/classes', require('./routes/classes'));
app.use('/api/subjects', require('./routes/subjects'));
app.use('/api/results', require('./routes/results'));
app.use('/api/academic', require('./routes/academic'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/grading', require('./routes/grading'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/fees', require('./routes/fees'));
app.use('/api/headmaster', require('./routes/headmaster'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/notices', require('./routes/notices'));
app.use('/api/events', require('./routes/events'));
app.use('/api/resources', require('./routes/resources'));
app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/submissions', require('./routes/submissions'));


// Serve client index.html for any non-API route (client-side routing)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'API endpoint not found.' });
  }
  const publicIndex = path.join(publicDir, 'index.html');
  const localIndex = path.join(clientDist, 'index.html');
  if (require('fs').existsSync(publicIndex)) return res.sendFile(publicIndex);
  if (require('fs').existsSync(localIndex)) return res.sendFile(localIndex);
  return next();
});


// Error Handler
app.use((err, req, res, next) => {

  console.error(err.stack);

  res.status(500).json({

    success:false,

    message:err.message || 'Internal Server Error'

  });

});



if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log('================================');
      console.log(`Server running on port ${PORT}`);
      console.log('Database: MongoDB Atlas');
      console.log('================================');
    });
  }).catch(err => {
    console.error('Failed to start server:', err.message);
    process.exitCode = 1;
  });
}

module.exports = app;