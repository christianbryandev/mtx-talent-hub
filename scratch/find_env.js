import fs from 'fs';
import path from 'path';

const files = fs.readdirSync(process.cwd());
console.log("Env files:", files.filter(f => f.startsWith('.env')));
