const fs = require('fs');
const path = require('path');

function fixDir(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      fixDir(p);
    } else if (p.endsWith('.tsx')) {
      let c = fs.readFileSync(p, 'utf8');
      let orig = c;
      c = c.replace(/fill="hsl\(var\(--primary\)\)"/g, 'fill="url(#grad-brand)"');
      c = c.replace(/fill="hsl\(var\(--info\)\)"/g, 'fill="url(#grad-cool)"');
      c = c.replace(/stroke="hsl\(var\(--primary\)\)"/g, 'stroke="url(#grad-brand)"');
      c = c.replace(/stroke="hsl\(var\(--info\)\)"/g, 'stroke="url(#grad-cool)"');
      c = c.replace(/stroke="hsl\(var\(--success\)\)"/g, 'stroke="url(#grad-warm)"');
      
      if(c !== orig) fs.writeFileSync(p, c);
    }
  }
}

fixDir('src/routes');
fixDir('src/components/dashboard');
