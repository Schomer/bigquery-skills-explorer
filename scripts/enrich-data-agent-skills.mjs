/**
 * Script to enrich the data-agent-skills.json with realistic file assets.
 * Run: node scripts/enrich-data-agent-skills.mjs
 */

import { readFileSync, writeFileSync } from 'fs';

const BASE_SOURCE = 'https://source.corp.google.com/piper///depot/google3/cloud/developer_experience/datacloud_vscode/antigravity/skills';

const data = JSON.parse(readFileSync('src/data/data-agent-skills.json', 'utf-8'));

// Common BUILD content
const makeBuild = (id) => `# Skill package for ${id}

load("//cloud/developer_experience/datacloud_vscode/antigravity/skills:skill_defs.bzl", "antigravity_skill")

package(default_visibility = ["//cloud/developer_experience/datacloud_vscode/antigravity:__subpackages__"])

antigravity_skill(
    name = "${id}",
    srcs = ["SKILL.md"],
    data = glob(["resources/**"]),
)

py_test(
    name = "${id}_test",
    srcs = ["${id}_test.py"],
    deps = [
        "//cloud/developer_experience/datacloud_vscode/antigravity/skills:process_skill",
    ],
)`;

// Skill-specific SKILL.md content (richer versions)
const skillMdContent = {
  accidental_data_loss_prevention: `---
name: accidental_data_loss_prevention
description: Prevents accidental data loss by validating destructive operations before execution.
metadata:
  version: 1.2.0
  tier: 3
  category: data-safety
  owner: data-agent-team
triggers:
  - "DROP TABLE"
  - "DROP DATASET"
  - "DELETE FROM"
  - "TRUNCATE TABLE"
---

# Accidental Data Loss Prevention

You are a safety-focused agent skill that prevents accidental data loss in BigQuery environments.

## Role

When a user attempts to execute a destructive SQL operation, you MUST:

1. **Identify the operation type** (DROP, DELETE, TRUNCATE)
2. **Validate scope** - Ensure the operation targets the intended resources
3. **Check for backups** - Verify recent snapshots or exports exist
4. **Prompt for confirmation** - Require explicit confirmation before proceeding
5. **Log the action** - Record the operation for audit compliance

## Safety Rules

- NEVER allow DROP TABLE on production datasets without explicit confirmation
- ALWAYS require WHERE clause for DELETE operations
- ALWAYS check if a recent backup exists before allowing DROP operations
- Flag any operation that would affect more than 10,000 rows

## Example Interaction

User: "Drop the users table in production"

You should respond:
- Identify this as a high-risk DROP TABLE operation
- Check for recent backups of the \`users\` table
- List dependent views and downstream tables
- Request explicit confirmation with the full table path`,

  building_data_apps: `---
name: building_data_apps
description: Guides users through building data-driven applications on Google Cloud.
metadata:
  version: 1.0.0
  tier: 3
  category: development
  owner: data-agent-team
triggers:
  - "build an app"
  - "create a dashboard"
  - "data application"
  - "web app with BigQuery"
---

# Building Data Apps

You are an expert at helping users build data-driven applications using Google Cloud services.

## Architecture Patterns

Guide users to choose the right architecture:

### 1. Direct Query Pattern
- Frontend queries BigQuery REST API directly
- Best for: internal tools, low-traffic dashboards
- Latency: 1-5 seconds

### 2. Cached Layer Pattern
- Materialized Views + Cloud Functions API layer
- Best for: customer-facing apps, moderate traffic
- Latency: 100-500ms

### 3. Real-time Pattern
- BigQuery subscriptions + Pub/Sub + WebSockets
- Best for: live dashboards, monitoring
- Latency: <1 second

## Tech Stack Recommendations

| Layer | Recommended | Alternative |
|-------|------------|-------------|
| Frontend | React + Vite | Angular, Vue |
| API | Cloud Functions | Cloud Run |
| Data | BigQuery + MV | Firestore cache |
| Auth | Firebase Auth | IAP |
| Hosting | Firebase Hosting | Cloud Run |

## Key Principles

1. Always use service accounts, never user credentials in apps
2. Implement proper caching to avoid excessive BigQuery costs
3. Use materialized views for frequently accessed aggregations
4. Design for eventual consistency in data pipelines`,

  gcp_dataflow: `---
name: gcp_dataflow
description: Supports development and troubleshooting of Apache Beam pipelines on Cloud Dataflow.
metadata:
  version: 1.6.0
  tier: 2
  category: data-pipeline
  owner: data-agent-team
triggers:
  - "Dataflow"
  - "Apache Beam"
  - "streaming pipeline"
  - "batch pipeline"
---

# GCP Dataflow

You are an expert at Apache Beam and Cloud Dataflow pipeline development.

## Capabilities

- Pipeline development in Python and Java SDKs
- Flex template creation and deployment
- Job submission, monitoring, and cancellation
- Performance tuning (autoscaling, shuffle service, worker configuration)
- Error diagnosis from Dataflow worker logs
- Streaming pipeline watermark and windowing guidance

## Common Troubleshooting

### Job Stuck in RUNNING
1. Check worker logs for OOM errors
2. Verify autoscaling settings (min/max workers)
3. Check for data skew in ParDo transforms
4. Monitor system lag and watermark progression

### High Latency in Streaming
1. Enable Streaming Engine for reduced latency
2. Check for hot keys causing worker imbalance
3. Review windowing and trigger configurations
4. Consider using Dataflow Prime for autotune

## Template Development

\`\`\`python
from apache_beam.options.pipeline_options import PipelineOptions

options = PipelineOptions([
    '--runner=DataflowRunner',
    '--project=my-project',
    '--region=us-central1',
    '--temp_location=gs://my-bucket/temp',
    '--staging_location=gs://my-bucket/staging',
])
\`\`\``,
};

// Generate test file content
const makeTest = (id) => `"""Tests for the ${id} skill."""

import unittest
from cloud.developer_experience.datacloud_vscode.antigravity.skills import process_skill


class ${id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}SkillTest(unittest.TestCase):
    """Test suite for ${id} skill."""

    def setUp(self):
        self.skill = process_skill.load_skill("${id}")

    def test_skill_loads(self):
        """Verify the skill definition loads without errors."""
        self.assertIsNotNone(self.skill)
        self.assertEqual(self.skill.name, "${id}")

    def test_skill_has_description(self):
        """Verify the skill has a non-empty description."""
        self.assertTrue(len(self.skill.description) > 0)

    def test_skill_has_triggers(self):
        """Verify the skill has at least one trigger defined."""
        self.assertTrue(len(self.skill.triggers) > 0)

    def test_skill_metadata(self):
        """Verify required metadata fields are present."""
        self.assertIn("version", self.skill.metadata)
        self.assertIn("tier", self.skill.metadata)
        self.assertIn("category", self.skill.metadata)


if __name__ == "__main__":
    unittest.main()
`;

// Enrich each skill
for (const skill of data.skills) {
  // Add source path
  skill.source_path = `${BASE_SOURCE}/${skill.id}/`;

  // Start fresh assets
  const assets = [];

  // 1. BUILD file (every skill has one)
  assets.push({
    name: 'BUILD',
    type: 'bzl',
    content: makeBuild(skill.id),
  });

  // 2. SKILL.md (use enriched version if available, otherwise use existing)
  const existingSkillMd = skill.assets?.find(a => a.name === 'SKILL.md');
  assets.push({
    name: 'SKILL.md',
    type: 'markdown',
    content: skillMdContent[skill.id] || existingSkillMd?.content || `---\nname: ${skill.id}\ndescription: ${skill.description}\nmetadata:\n  version: 1.0.0\n---\n\n# ${skill.name}\n\n${skill.documentation || skill.description}`,
  });

  // 3. Test file (every skill has one)
  assets.push({
    name: `${skill.id}_test.py`,
    type: 'python',
    content: makeTest(skill.id),
  });

  skill.assets = assets;
}

// Also add root-level repository files to a special metadata field
data.repository_files = [
  {
    name: 'BUILD',
    type: 'bzl',
    content: `# Root BUILD file for Antigravity Skills

package(default_visibility = ["//cloud/developer_experience/datacloud_vscode/antigravity:__subpackages__"])

exports_files(glob(["*.py", "*.sh", "*.bzl"]))`,
  },
  {
    name: 'README.md',
    type: 'markdown',
    content: `# Antigravity Skills

This directory contains the skill definitions for the Data Agent Toolkit.

## Directory Structure

Each skill is defined in its own directory with the following structure:

\`\`\`
skill_name/
  BUILD           # Bazel build rules
  SKILL.md        # Skill definition and prompt
  *_test.py       # Skill tests
  resources/      # Optional resource files
\`\`\`

## Adding a New Skill

1. Create a new directory with your skill name (snake_case)
2. Add a \`SKILL.md\` with frontmatter metadata and skill prompt
3. Add a \`BUILD\` file using the \`antigravity_skill\` rule
4. Run \`check_skill_version.sh\` to validate
5. Submit for review

## Testing

Run all skill tests:
\`\`\`bash
blaze test //cloud/developer_experience/datacloud_vscode/antigravity/skills/...
\`\`\`

## Scripts

- \`check_skill_version.sh\` - Validates skill version metadata
- \`process_skill.py\` - Processes skill definitions for deployment
- \`upload_eval_skills.sh\` - Uploads skills to evaluation environment`,
  },
  {
    name: 'OWNERS',
    type: 'txt',
    content: `# Antigravity Skills Owners
# go/anthropic-skills-owners

set noparent

per-file * = data-agent-core-team@google.com
per-file METADATA = anthropic-infra@google.com`,
  },
  {
    name: 'METADATA',
    type: 'txt',
    content: `name: "antigravity_skills"
description: "Skill definitions for the Antigravity Data Agent Toolkit"

third_party {
  type: GOOGLE_INTERNAL
}`,
  },
  {
    name: 'process_skill.py',
    type: 'python',
    content: `"""Process and validate skill definitions for deployment."""

import os
import re
import yaml
from pathlib import Path
from typing import Dict, Any, Optional


class Skill:
    """Represents a parsed skill definition."""

    def __init__(self, name: str, description: str, metadata: Dict[str, Any],
                 triggers: list, content: str):
        self.name = name
        self.description = description
        self.metadata = metadata
        self.triggers = triggers
        self.content = content


def load_skill(skill_name: str) -> Optional[Skill]:
    """Load a skill definition from its directory.
    
    Args:
        skill_name: Name of the skill directory.
        
    Returns:
        Parsed Skill object, or None if not found.
    """
    skill_dir = Path(__file__).parent / skill_name
    skill_md = skill_dir / "SKILL.md"
    
    if not skill_md.exists():
        return None
    
    content = skill_md.read_text()
    
    # Parse frontmatter
    fm_match = re.match(r"^---\\n(.+?)\\n---\\n(.*)$", content, re.DOTALL)
    if not fm_match:
        raise ValueError(f"Invalid SKILL.md format for {skill_name}")
    
    frontmatter = yaml.safe_load(fm_match.group(1))
    body = fm_match.group(2)
    
    return Skill(
        name=frontmatter.get("name", skill_name),
        description=frontmatter.get("description", ""),
        metadata=frontmatter.get("metadata", {}),
        triggers=frontmatter.get("triggers", []),
        content=body,
    )


def validate_skill(skill: Skill) -> list:
    """Validate a skill definition and return any issues."""
    issues = []
    
    if not skill.name:
        issues.append("Missing skill name")
    if not skill.description:
        issues.append("Missing skill description")
    if not skill.metadata.get("version"):
        issues.append("Missing version in metadata")
    if not skill.triggers:
        issues.append("No triggers defined")
    if len(skill.content) < 100:
        issues.append("Skill content seems too short")
    
    return issues`,
  },
  {
    name: 'skill_defs.bzl',
    type: 'bzl',
    content: `"""Bazel rules for defining Antigravity skills."""

def antigravity_skill(name, srcs, data = [], deps = [], visibility = None):
    """Define an Antigravity skill package.
    
    Args:
        name: Skill name (should match directory name).
        srcs: Source files (typically ["SKILL.md"]).
        data: Additional data files (resources, examples).
        deps: Dependencies on other skills or libraries.
        visibility: Build visibility.
    """
    native.filegroup(
        name = name,
        srcs = srcs + data,
        visibility = visibility,
    )
    
    native.genrule(
        name = name + "_validate",
        srcs = srcs,
        outs = [name + "_validation.txt"],
        cmd = "$(location //cloud/developer_experience/datacloud_vscode/antigravity/skills:check_skill_version.sh) $(SRCS) > $@",
        tools = ["//cloud/developer_experience/datacloud_vscode/antigravity/skills:check_skill_version.sh"],
    )`,
  },
  {
    name: 'check_skill_version.sh',
    type: 'sh',
    content: `#!/bin/bash
# Validates skill version metadata in SKILL.md files.
# Usage: check_skill_version.sh <path_to_skill_md>

set -euo pipefail

SKILL_MD="\${1:?Usage: check_skill_version.sh <SKILL.md>}"

if [[ ! -f "$SKILL_MD" ]]; then
    echo "ERROR: File not found: $SKILL_MD"
    exit 1
fi

# Extract version from frontmatter
VERSION=$(grep -A1 'version:' "$SKILL_MD" | tail -1 | tr -d ' ')

if [[ -z "$VERSION" ]]; then
    echo "ERROR: No version found in $SKILL_MD"
    exit 1
fi

# Validate semver format
if [[ ! "$VERSION" =~ ^[0-9]+\\.[0-9]+\\.[0-9]+$ ]]; then
    echo "ERROR: Invalid version format: $VERSION (expected semver)"
    exit 1
fi

echo "OK: $SKILL_MD version $VERSION"`,
  },
  {
    name: 'upload_eval_skills.sh',
    type: 'sh',
    content: `#!/bin/bash
# Uploads processed skills to the evaluation environment.
# Usage: upload_eval_skills.sh [--env staging|prod] [--skill <name>]

set -euo pipefail

ENV="\${1:-staging}"
SKILL_NAME="\${2:-all}"
SKILLS_DIR="$(dirname "$0")"

echo "Uploading skills to $ENV environment..."

if [[ "$SKILL_NAME" == "all" ]]; then
    for dir in "$SKILLS_DIR"/*/; do
        if [[ -f "$dir/SKILL.md" ]]; then
            skill=$(basename "$dir")
            echo "  Processing: $skill"
            python3 "$SKILLS_DIR/process_skill.py" --skill "$skill" --env "$ENV"
        fi
    done
else
    echo "  Processing: $SKILL_NAME"
    python3 "$SKILLS_DIR/process_skill.py" --skill "$SKILL_NAME" --env "$ENV"
fi

echo "Upload complete."`,
  },
];

writeFileSync('src/data/data-agent-skills.json', JSON.stringify(data, null, 2) + '\n');
console.log(`Enriched ${data.skills.length} skills with realistic file assets.`);
console.log(`Added ${data.repository_files.length} repository-level files.`);
