/**
 * Reads the real data-agent-kit repo and generates JSON data for the app.
 * Run: node scripts/build-real-data-agent-skills.mjs
 */

import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'fs';
import { join, relative, extname, basename } from 'path';

const REPO_ROOT = '/tmp/data-agent-kit';
const GITHUB_BASE = 'https://github.com/GoogleCloudPlatform/data-agent-kit';
const OUTPUT = 'src/data/data-agent-skills.json';

// Extension to "type" mapping
function getFileType(filename) {
  const ext = extname(filename).toLowerCase().replace('.', '');
  const map = {
    py: 'python', js: 'javascript', ts: 'typescript', json: 'json',
    md: 'markdown', yml: 'yaml', yaml: 'yaml', sh: 'sh',
    sql: 'sql', txt: 'text', cfg: 'text', toml: 'toml',
    ini: 'text', lock: 'text', '': 'text',
  };
  return map[ext] || ext || 'text';
}

// Read a directory tree recursively
function readTree(dirPath, relBase = '') {
  const entries = [];
  
  let items;
  try {
    items = readdirSync(dirPath);
  } catch {
    return entries;
  }
  
  // Sort: directories first, then files
  const sorted = items
    .filter(name => !name.startsWith('.git') && name !== 'node_modules' && name !== '__pycache__')
    .sort((a, b) => {
      const aIsDir = safeIsDir(join(dirPath, a));
      const bIsDir = safeIsDir(join(dirPath, b));
      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      return a.localeCompare(b);
    });

  for (const name of sorted) {
    const fullPath = join(dirPath, name);
    const relPath = relBase ? `${relBase}/${name}` : name;
    
    if (safeIsDir(fullPath)) {
      // Check if it's a git submodule (empty or has .git file)
      const isSubmodule = isGitSubmodule(fullPath);
      
      if (isSubmodule) {
        // Represent submodule as a special entry
        entries.push({
          name,
          path: relPath,
          type: 'submodule',
          isDirectory: true,
          submoduleUrl: getSubmoduleUrl(name),
          children: [],
        });
      } else {
        const children = readTree(fullPath, relPath);
        entries.push({
          name,
          path: relPath,
          type: 'directory',
          isDirectory: true,
          children,
        });
      }
    } else {
      // Read file content
      let content = '';
      try {
        const stat = statSync(fullPath);
        // Skip binary files and very large files (> 100KB)
        if (stat.size < 100000) {
          content = readFileSync(fullPath, 'utf-8');
          // Check if it's actually binary
          if (content.includes('\x00')) {
            content = `[Binary file - ${stat.size} bytes]`;
          }
        } else {
          content = `[File too large to display - ${(stat.size / 1024).toFixed(1)} KB]`;
        }
      } catch (e) {
        content = `[Could not read file: ${e.message}]`;
      }
      
      entries.push({
        name,
        path: relPath,
        type: getFileType(name),
        isDirectory: false,
        size: content.length,
        content,
      });
    }
  }
  
  return entries;
}

function safeIsDir(p) {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function isGitSubmodule(dirPath) {
  // Git submodules in shallow clones are empty dirs or have a .git file (not dir)
  const gitPath = join(dirPath, '.git');
  try {
    const items = readdirSync(dirPath).filter(n => n !== '.git');
    if (items.length === 0) return true; // empty dir = submodule
    if (existsSync(gitPath) && !statSync(gitPath).isDirectory()) return true;
  } catch {
    return false;
  }
  return false;
}

function getSubmoduleUrl(name) {
  // Parse .gitmodules for the URL
  try {
    const gitmodules = readFileSync(join(REPO_ROOT, '.gitmodules'), 'utf-8');
    const regex = new RegExp(`\\[submodule "${name}"\\][\\s\\S]*?url = (.+)`, 'm');
    const match = gitmodules.match(regex);
    if (match) return match[1].trim();
  } catch {}
  return `${GITHUB_BASE}/tree/main/${name}`;
}

// Read the README for repo metadata
function readReadme() {
  try {
    return readFileSync(join(REPO_ROOT, 'README.md'), 'utf-8');
  } catch {
    return '';
  }
}

// Build the full data structure
console.log('Reading data-agent-kit repository...');
const tree = readTree(REPO_ROOT);
const readme = readReadme();

// Count stats
let fileCount = 0;
let dirCount = 0;
let submoduleCount = 0;
function countItems(items) {
  for (const item of items) {
    if (item.type === 'submodule') {
      submoduleCount++;
    } else if (item.isDirectory) {
      dirCount++;
      if (item.children) countItems(item.children);
    } else {
      fileCount++;
    }
  }
}
countItems(tree);

// Read current data-agent-skills.json for existing skill metadata (categories, tiers, etc.)
let existingData = { skills: [], meta_skill_routers: [] };
try {
  existingData = JSON.parse(readFileSync(OUTPUT, 'utf-8'));
} catch {}

// Build the output
const output = {
  repository: {
    name: 'data-agent-kit',
    fullName: 'GoogleCloudPlatform/data-agent-kit',
    url: GITHUB_BASE,
    description: 'Data Agent Kit — tools and connectors for building data agents on Google Cloud',
    defaultBranch: 'main',
    stats: {
      files: fileCount,
      directories: dirCount,
      submodules: submoduleCount,
    },
  },
  tree,
  // Preserve existing skill abstractions for the explorer/graph/test views
  skills: existingData.skills || [],
  meta_skill_routers: existingData.meta_skill_routers || [],
};

writeFileSync(OUTPUT, JSON.stringify(output, null, 2) + '\n');

console.log(`Generated ${OUTPUT}`);
console.log(`  ${fileCount} files, ${dirCount} directories, ${submoduleCount} submodules`);
console.log(`  Preserved ${output.skills.length} skill definitions`);
