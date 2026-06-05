const fs = require('fs');

function applyTheme(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/<Card className="border-border\/60 bg-card\/70/g, '<Card className="pulse-card border-border/60 bg-card/70');
  
  // Replace simple fill="#xxxxxx"
  content = content.replace(/fill="#8b5cf6"/g, 'fill="url(#grad-cool)"');
  content = content.replace(/fill="#10b981"/g, 'fill="url(#grad-brand)"');
  content = content.replace(/fill="#f59e0b"/g, 'fill="url(#grad-warm)"');
  content = content.replace(/fill="#ef4444"/g, 'fill="url(#grad-mid)"');
  content = content.replace(/fill="#6366f1"/g, 'fill="url(#grad-cool)"');
  content = content.replace(/fill="#f43f5e"/g, 'fill="url(#grad-brand)"');

  // Replace COLORS arrays for pie charts
  content = content.replace(/const COLORS = \[[^\]]*\];/g, 'const COLORS = ["url(#grad-brand)", "url(#grad-cool)", "url(#grad-warm)", "url(#grad-mid)"];');

  fs.writeFileSync(filePath, content);
}

applyTheme('src/routes/_authenticated/dashboard.tsx');
try { applyTheme('src/components/dashboard/ComercialDashboard.tsx'); } catch(e){}
try { applyTheme('src/components/dashboard/JovemAprendizDashboard.tsx'); } catch(e){}
