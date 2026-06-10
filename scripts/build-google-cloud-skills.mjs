/**
 * Reads the real google/skills cloud directory and generates JSON data.
 * Run: node scripts/build-google-cloud-skills.mjs
 */

import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'fs';
import { join, extname } from 'path';

const REPO_ROOT = '/tmp/google-skills';
const SKILLS_DIR = join(REPO_ROOT, 'skills', 'cloud');
const GITHUB_BASE = 'https://github.com/google/skills/tree/main/skills/cloud';
const OUTPUT = 'src/data/google-cloud-skills.json';

function getFileType(filename) {
  const ext = extname(filename).toLowerCase().replace('.', '');
  const map = {
    py: 'python', js: 'javascript', ts: 'typescript', json: 'json',
    md: 'markdown', yml: 'yaml', yaml: 'yaml', sh: 'sh',
    sql: 'sql', txt: 'text', cfg: 'text', toml: 'toml', '': 'text',
  };
  return map[ext] || ext || 'text';
}

function safeIsDir(p) {
  try { return statSync(p).isDirectory(); } catch { return false; }
}

function readTree(dirPath, relBase = '') {
  const entries = [];
  let items;
  try { items = readdirSync(dirPath); } catch { return entries; }
  
  const sorted = items
    .filter(name => !name.startsWith('.'))
    .sort((a, b) => {
      const aD = safeIsDir(join(dirPath, a));
      const bD = safeIsDir(join(dirPath, b));
      if (aD && !bD) return -1;
      if (!aD && bD) return 1;
      return a.localeCompare(b);
    });

  for (const name of sorted) {
    const fullPath = join(dirPath, name);
    const relPath = relBase ? `${relBase}/${name}` : name;
    
    if (safeIsDir(fullPath)) {
      const children = readTree(fullPath, relPath);
      entries.push({ name, path: relPath, type: 'directory', isDirectory: true, children });
    } else {
      let content = '';
      try {
        const stat = statSync(fullPath);
        if (stat.size < 100000) {
          content = readFileSync(fullPath, 'utf-8');
          if (content.includes('\x00')) content = `[Binary file - ${stat.size} bytes]`;
        } else {
          content = `[File too large - ${(stat.size / 1024).toFixed(1)} KB]`;
        }
      } catch (e) { content = `[Error: ${e.message}]`; }
      
      entries.push({
        name, path: relPath, type: getFileType(name),
        isDirectory: false, size: content.length, content,
      });
    }
  }
  return entries;
}

console.log('Reading google/skills cloud directory...');
const tree = readTree(SKILLS_DIR);

let fileCount = 0, dirCount = 0;
function count(items) {
  for (const i of items) {
    if (i.isDirectory) { dirCount++; if (i.children) count(i.children); } else { fileCount++; }
  }
}
count(tree);

const output = {
  repository: {
    name: 'google-cloud-skills',
    fullName: 'google/skills (skills/cloud)',
    url: GITHUB_BASE,
    description: 'Google Cloud Skills — curated skill definitions for Cloud products and services',
    defaultBranch: 'main',
    stats: { files: fileCount, directories: dirCount, submodules: 0 },
  },
  tree,
  skills: [],
  meta_skill_routers: [],
};

writeFileSync(OUTPUT, JSON.stringify(output, null, 2) + '\n');
console.log(`Generated ${OUTPUT}`);
console.log(`  ${fileCount} files, ${dirCount} directories`);
