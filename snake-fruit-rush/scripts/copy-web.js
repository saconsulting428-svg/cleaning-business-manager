// Copies the web game into www/ (Capacitor's webDir). Only runtime files are copied.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.join(root, 'www');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
['index.html', 'style.css', 'game.js', 'ads.js'].forEach(f => fs.copyFileSync(path.join(root, f), path.join(out, f)));
fs.cpSync(path.join(root, 'assets'), path.join(out, 'assets'), { recursive: true });
console.log('web assets copied to www/');
