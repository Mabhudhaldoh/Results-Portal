const fs = require('fs');
const path = require('path');

const source = path.resolve(__dirname, '..', 'client', 'dist');
const destination = path.resolve(__dirname, '..', 'public');

if (!fs.existsSync(path.join(source, 'index.html'))) {
  throw new Error('Frontend build did not produce client/dist/index.html');
}

fs.mkdirSync(destination, { recursive: true });
fs.cpSync(source, destination, { recursive: true, force: true });
console.log('Frontend build copied to public/ for Vercel static hosting.');
