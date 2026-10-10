// Loads the new simulation + level data (plain browser scripts) into Node.
const fs = require('fs'), path = require('path');
const src = ['levels.js', 'sim.js'].map(f => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8')).join('\n');
module.exports = new Function(src + '\n;return { LEVELS, CHAPTERS, PER_CHAPTER, Sim };')();
