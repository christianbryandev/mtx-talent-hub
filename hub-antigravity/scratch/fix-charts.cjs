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
      c = c.replace(/<CartesianGrid([^>]*?)>/g, (match, props) => {
        if(props.includes('fill="transparent"')) return match;
        return '<CartesianGrid' + props + ' fill="transparent" verticalFill={["transparent", "transparent"]} horizontalFill={["transparent", "transparent"]} />';
      });
      c = c.replace(/<Bar([^>]*?)>/g, (match, props) => {
        if(props.includes('maxBarSize')) return match;
        return '<Bar' + props + ' maxBarSize={60} />';
      });
      if(c !== orig) fs.writeFileSync(p, c);
    }
  }
}

fixDir('src/routes');
fixDir('src/components');
