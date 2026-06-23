import fs from 'fs';
import path from 'path';

try {
  const claudeJsonPath = 'c:/Users/chris/.claude.json';
  if (fs.existsSync(claudeJsonPath)) {
    const data = JSON.parse(fs.readFileSync(claudeJsonPath, 'utf-8'));
    console.log("Claude JSON keys:", Object.keys(data));
    if (data.projects) {
      console.log("Projects:", Object.keys(data.projects));
      // Look for environment variables or similar configuration
      console.log(JSON.stringify(data.projects, null, 2).slice(0, 1000));
    }
  } else {
    console.log(".claude.json does not exist");
  }
} catch (e) {
  console.error(e);
}
