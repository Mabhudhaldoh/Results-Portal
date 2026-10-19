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


// Rate Limiting
const limiter = rateLimit({

  windowMs: 15 * 60 * 1000,

  max: 500,

  message: 'Too many requests, please try again later.'

});


app.use('/api', limiter);


// Static Files
app.use('/uploads', express.static(
  path.join(__dirname, 'uploads')
));

const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (require('fs').existsSync(clientDist)) {
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
if (require('fs').existsSync(clientDist)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}


// Error Handler
app.use((err, req, res, next) => {

  console.error(err.stack);

  res.status(500).json({

    success:false,

    message:err.message || 'Internal Server Error'

  });

});



const PORT = process.env.PORT || 5000;


connectDB().then(() => {
  app.listen(PORT, () => {
    console.log('================================');
    console.log(`🚀 Server running on port ${PORT}`);
    console.log('🗄️ Database: MongoDB Atlas');
    console.log('================================');
  });
}).catch(err => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});