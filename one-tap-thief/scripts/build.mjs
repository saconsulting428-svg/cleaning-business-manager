// Copies the web app into www/ (Capacitor's webDir). No bundler needed: the game is plain ES modules.
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(fileURLToPath(import.meta.url), '..', '..');
rmSync(join(root, 'www'), { recursive: true, force: true });
mkdirSync(join(root, 'www'), { recursive: true });
cpSync(join(root, 'index.html'), join(root, 'www', 'index.html'));
cpSync(join(root, 'src'), join(root, 'www', 'src'), { recursive: true });
console.log('built → www/');
