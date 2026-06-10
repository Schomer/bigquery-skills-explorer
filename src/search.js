/**
 * BQ Skill Explorer — Search Index & Query Engine
 * Indexes skill data and provides full-text search with highlighted results.
 */

export class SearchEngine {
  constructor() {
    /** @type {Array<{skillId: string, field: string, text: string, displayName: string, icon: string}>} */
    this.entries = [];
  }

  /**
   * Build the search index from skills data.
   * @param {Array} skills
   */
  buildIndex(skills) {
    this.entries = [];

    for (const skill of skills) {
      // Index skill name
      this.entries.push({
        skillId: skill.id,
        field: 'Skill Name',
        text: skill.name,
        displayName: skill.name,
        icon: 'build',
      });

      // Index description
      this.entries.push({
        skillId: skill.id,
        field: 'Description',
        text: skill.description,
        displayName: skill.name,
        icon: 'description',
      });

      // Index category
      this.entries.push({
        skillId: skill.id,
        field: 'Category',
        text: skill.category,
        displayName: skill.name,
        icon: 'folder',
      });

      // Index owner
      this.entries.push({
        skillId: skill.id,
        field: 'Owner',
        text: skill.owner,
        displayName: skill.name,
        icon: 'group',
      });

      // Index documentation
      if (skill.documentation) {
        this.entries.push({
          skillId: skill.id,
          field: 'Documentation',
          text: skill.documentation,
          displayName: skill.name,
          icon: 'menu_book',
        });
      }

      // Index asset filenames
      for (const asset of skill.assets || []) {
        this.entries.push({
          skillId: skill.id,
          field: 'Asset',
          text: asset.name,
          displayName: skill.name,
          icon: 'code',
        });
      }

      // Index symptoms
      for (const symptom of skill.symptoms || []) {
        this.entries.push({
          skillId: skill.id,
          field: 'Symptom',
          text: symptom,
          displayName: skill.name,
          icon: 'healing',
        });
      }
    }
  }

  /**
   * Search the index.
   * @param {string} query
   * @param {number} maxResults
   * @returns {Array<{skillId: string, field: string, text: string, displayName: string, icon: string, highlight: string}>}
   */
  search(query, maxResults = 8) {
    if (!query || query.trim().length < 2) return [];

    const q = query.toLowerCase().trim();
    const results = [];
    const seenSkillFields = new Set();

    for (const entry of this.entries) {
      const idx = entry.text.toLowerCase().indexOf(q);
      if (idx === -1) continue;

      const key = `${entry.skillId}:${entry.field}`;
      if (seenSkillFields.has(key)) continue;
      seenSkillFields.add(key);

      // Create highlighted snippet
      const contextStart = Math.max(0, idx - 40);
      const contextEnd = Math.min(entry.text.length, idx + q.length + 40);
      let snippet = entry.text.slice(contextStart, contextEnd);
      if (contextStart > 0) snippet = '...' + snippet;
      if (contextEnd < entry.text.length) snippet += '...';

      // Replace matched text with <mark>
      const matchText = entry.text.slice(idx, idx + q.length);
      const highlight = snippet.replace(
        new RegExp(escapeRegex(matchText), 'i'),
        `<mark>${matchText}</mark>`
      );

      results.push({
        ...entry,
        highlight,
        relevance: entry.field === 'Skill Name' ? 3 :
                   entry.field === 'Symptom' ? 2 :
                   entry.field === 'Description' ? 1 : 0,
      });

      if (results.length >= maxResults * 2) break;
    }

    // Sort by relevance, then trim
    results.sort((a, b) => b.relevance - a.relevance);
    return results.slice(0, maxResults);
  }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
