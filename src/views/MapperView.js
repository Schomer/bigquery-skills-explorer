/**
 * BQ Skill Explorer — Symptom-to-Skill Mapper View
 */

export class MapperView {
  /**
   * @param {HTMLElement} container
   * @param {{ skills: Array, router: import('../router.js').Router, initialQuery?: string }} deps
   */
  constructor(container, deps) {
    this.container = container;
    this.skills = deps.skills;
    this.router = deps.router;
    this.allTiers = false;
    this.query = deps.initialQuery || '';

    this.render();
    if (this.query) {
      this.container.querySelector('#mapper-input').value = this.query;
      this.performSearch(this.query);
    }
  }

  render() {
    this.container.innerHTML = `
      <div class="mapper view-enter">
        <div class="mapper__header">
          <h1 class="mapper__title">Symptom-to-Skill Mapper</h1>
          <p class="mapper__subtitle">Describe a symptom to find the right playbook</p>
        </div>
        <div class="mapper__search-wrapper">
          <span class="material-symbols-outlined mapper__search-icon">healing</span>
          <input
            type="text"
            class="mapper__search-input"
            id="mapper-input"
            placeholder="e.g., query too complex, slot contention, ingestion failure..."
            autocomplete="off"
          />
        </div>
        <div class="mapper__toggle">
          <span class="mapper__toggle-label">Search all tiers</span>
          <div class="mapper__toggle-switch ${this.allTiers ? 'mapper__toggle-switch--active' : ''}" id="mapper-toggle"></div>
        </div>
        <div class="mapper__results" id="mapper-results">
          <div class="empty-state">
            <span class="material-symbols-outlined empty-state__icon">healing</span>
            <div class="empty-state__title">Enter a symptom to get started</div>
            <div class="empty-state__description">
              Search for symptoms like "slow query", "ingestion failure", or "permission denied" to find the right diagnostic playbook.
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const input = this.container.querySelector('#mapper-input');
    let debounceTimer = null;

    input.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this.query = e.target.value;
        this.performSearch(this.query);
      }, 150);
    });

    // Toggle
    this.container.querySelector('#mapper-toggle')?.addEventListener('click', () => {
      this.allTiers = !this.allTiers;
      this.container.querySelector('#mapper-toggle').classList.toggle('mapper__toggle-switch--active', this.allTiers);
      this.performSearch(this.query);
    });

    // Focus input
    input.focus();
  }

  performSearch(query) {
    const results = this.container.querySelector('#mapper-results');

    if (!query || query.trim().length < 2) {
      results.innerHTML = `
        <div class="empty-state">
          <span class="material-symbols-outlined empty-state__icon">healing</span>
          <div class="empty-state__title">Enter a symptom to get started</div>
          <div class="empty-state__description">
            Search for symptoms like "slow query", "ingestion failure", or "permission denied" to find the right diagnostic playbook.
          </div>
        </div>
      `;
      return;
    }

    const q = query.toLowerCase().trim();
    let candidates = this.skills;

    // Filter to Tier 3 only unless allTiers is on
    if (!this.allTiers) {
      candidates = candidates.filter(s => s.tier === 3);
    }

    // Search across symptoms, name, description
    const matches = [];
    for (const skill of candidates) {
      let score = 0;
      const matchedSymptoms = [];

      // Check symptoms
      for (const symptom of skill.symptoms || []) {
        if (symptom.toLowerCase().includes(q)) {
          score += 3;
          matchedSymptoms.push(symptom);
        }
      }

      // Check name
      if (skill.name.toLowerCase().includes(q)) {
        score += 2;
      }

      // Check description
      if (skill.description.toLowerCase().includes(q)) {
        score += 1;
      }

      if (score > 0) {
        matches.push({ skill, score, matchedSymptoms });
      }
    }

    matches.sort((a, b) => b.score - a.score);

    if (matches.length === 0) {
      results.innerHTML = `
        <div class="empty-state">
          <span class="material-symbols-outlined empty-state__icon">search_off</span>
          <div class="empty-state__title">No matching playbooks found</div>
          <div class="empty-state__description">
            Try different keywords or enable "Search all tiers" to broaden results.
          </div>
        </div>
      `;
      return;
    }

    results.innerHTML = matches.map(({ skill, matchedSymptoms }) => `
      <div class="mapper__result-card" data-skill-id="${skill.id}">
        <div class="mapper__result-header">
          <span class="mapper__result-name">${this.highlightText(skill.name, q)}</span>
          <span class="tier-badge tier-badge--${skill.tier}">Tier ${skill.tier}</span>
          <span class="chip chip--blue">
            <span class="material-symbols-outlined" style="font-size: 14px;">group</span>
            ${skill.owner}
          </span>
        </div>
        ${matchedSymptoms.length > 0 ? `
          <div class="mapper__result-symptoms">
            ${(skill.symptoms || []).map(s =>
              matchedSymptoms.includes(s)
                ? `<span class="mapper__result-symptom mapper__result-symptom--matched">${s}</span>`
                : `<span class="mapper__result-symptom">${s}</span>`
            ).join('')}
          </div>
        ` : ''}
        <p class="mapper__result-description">${this.highlightText(skill.description, q)}</p>
        <div class="mapper__result-footer">
          <span class="chip">${this.formatCategory(skill.category)}</span>
          ${skill.assets?.length ? `<span class="chip"><span class="material-symbols-outlined" style="font-size: 14px;">code</span> ${skill.assets.length} assets</span>` : ''}
        </div>
      </div>
    `).join('');

    // Bind click events
    results.querySelectorAll('.mapper__result-card').forEach(card => {
      card.addEventListener('click', () => {
        this.router.navigate(`/skill/${card.dataset.skillId}`);
      });
    });
  }

  highlightText(text, query) {
    if (!query) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>');
  }

  formatCategory(cat) {
    return cat.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  destroy() {
    this.container.innerHTML = '';
  }
}
