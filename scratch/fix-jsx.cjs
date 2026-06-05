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
      
      // Fix broken syntax
      c = c.replace(/\/\s*fill="transparent"/g, 'fill="transparent" /');
      c = c.replace(/\/\s*maxBarSize={60}\s*\/>/g, 'maxBarSize={60} />');
      c = c.replace(/\/\s*verticalFill=\S+\s*horizontalFill=\S+\s*\/>/g, match => match.replace(/^\/\s*/, '') + ' />');
      c = c.replace(/\/ fill="transparent" verticalFill=\{\["transparent", "transparent"\]\} horizontalFill=\{\["transparent", "transparent"\]\} \/>/g, 'fill="transparent" verticalFill={["transparent", "transparent"]} horizontalFill={["transparent", "transparent"]} />');

      // Add cursor and text styles to Tooltip
      c = c.replace(/<Tooltip([^>]*?)>/g, (match, props) => {
        let newProps = props;
        if (!newProps.includes('itemStyle')) {
          newProps += ' itemStyle={{ color: "white" }}';
        }
        if (!newProps.includes('cursor')) {
          newProps += ' cursor={{ fill: "rgba(255,255,255,0.05)" }}';
        }
        if (!newProps.includes('contentStyle')) {
          newProps += ' contentStyle={{ background: "#11111A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "white" }}';
        }
        // Handle self closing
        if (newProps.endsWith('/')) {
            return '<Tooltip' + newProps.slice(0, -1) + '/>';
        }
        return '<Tooltip' + newProps + '>';
      });

      if(c !== orig) fs.writeFileSync(p, c);
    }
  }
}

fixDir('src/routes');
fixDir('src/components');
