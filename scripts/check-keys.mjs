import fs from 'fs';

for (const file of ['.secrets/env.master', 'apps/api/.env.local', 'apps/web/.env.local']) {
  if (fs.existsSync(file)) {
    console.log(`\n=== ${file} ===`);
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    for (const l of lines) {
      const match = l.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match) {
        const k = match[1];
        const v = match[2].trim().replace(/^['"]|['"]$/g, '');
        if (k.includes('KEY') || k.includes('SECRET') || k.includes('TOKEN')) {
          console.log(`${k}=${v ? v.substring(0, 4) + '...' + v.substring(v.length - 4) : '<empty>'}`);
        } else {
          console.log(`${k}=${v}`);
        }
      }
    }
  }
}
