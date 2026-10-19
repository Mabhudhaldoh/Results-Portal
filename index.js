// Root Express entry point used by Vercel. Also supports local startup with npm start.
const app = require('./server/index');

if (require.main === module) {
  const { connectDB } = require('./server/config/db');
  const port = process.env.PORT || 5000;
  connectDB()
    .then(() => app.listen(port, () => console.log(`Results Portal API running on port ${port}`)))
    .catch((error) => {
      console.error('Failed to start Results Portal:', error.message);
      process.exitCode = 1;
    });
}

module.exports = app;
