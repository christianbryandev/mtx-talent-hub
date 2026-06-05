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
      
      // Fix BarChart that was incorrectly self-closed
      c = c.replace(/<BarChart([^>]*?)\s*maxBarSize=\{60\}\s*\/>/g, '<BarChart$1>');

      // Fix Tooltip that was stripped of styles
      c = c.replace(/<Tooltip \/>/g, '<Tooltip contentStyle={{ background: "#11111A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "white" }} itemStyle={{ color: "white" }} cursor={{ fill: "rgba(255,255,255,0.05)" }} />');
      
      // Also catch any <Tooltip> without styles
      c = c.replace(/<Tooltip>/g, '<Tooltip contentStyle={{ background: "#11111A", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "white" }} itemStyle={{ color: "white" }} cursor={{ fill: "rgba(255,255,255,0.05)" }}>');

      // Check if there are any lingering <Bar> without maxBarSize? My previous script did: c = c.replace(/<Bar([^>]*?)>/g, ...). It matched <BarChart> but did it also match <Bar>?
      // Yes, because <Bar> also starts with <Bar. The fix-charts.cjs actually did both! But wait, fix-charts.cjs was:
      // c.replace(/<Bar([^>]*?)>/g, ...). This matches <BarChart ... > because BarChart starts with Bar.
      // So <BarChart data={...}> became <BarChart data={...} maxBarSize={60} />
      
      if(c !== orig) fs.writeFileSync(p, c);
    }
  }
}

fixDir('src/routes');
fixDir('src/components');
