/**
 * BQ Skill Explorer — Explorer View (3-Column Finder)
 */

const TIER_CONFIG = {
  1: { name: 'Infrastructure', icon: 'dns', description: 'Core platform components' },
  2: { name: 'Components', icon: 'widgets', description: 'Reusable analysis modules' },
  3: { name: 'Playbooks', icon: 'auto_fix_high', description: 'Symptom-driven runbooks' },
};

export class ExplorerView {
  /**
   * @param {HTMLElement} container
   * @param {{ skills: Array, router: import('../router.js').Router }} deps
   */
  constructor(container, deps) {
    this.container = container;
    this.skills = deps.skills;
    this.router = deps.router;

    this.selectedTier = null;
    this.selectedCategory = null;

    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="explorer view-enter">
        <div class="explorer__breadcrumb" id="explorer-breadcrumb">
          <span class="material-symbols-outlined" style="font-size: 18px; color: var(--on-surface-muted);">home</span>
          <span class="explorer__breadcrumb-item explorer__breadcrumb-item--active">All Tiers</span>
        </div>
        <div class="explorer__columns" id="explorer-columns">
          <div class="explorer__column" id="tier-column">
            <div class="explorer__column-header">
              <span class="material-symbols-outlined explorer__column-header-icon">layers</span>
              Tiers
            </div>
            <div class="explorer__column-list" id="tier-list"></div>
          </div>
        </div>
      </div>
    `;

    this.renderTierColumn();
  }

  renderTierColumn() {
    const list = this.container.querySelector('#tier-list');
    const tiers = [1, 2, 3];

    list.innerHTML = tiers.map(tier => {
      const config = TIER_CONFIG[tier];
      const count = this.skills.filter(s => s.tier === tier).length;
      return `
        <div class="explorer__item explorer__item--tier-${tier} ${this.selectedTier === tier ? 'explorer__item--selected' : ''}"
             data-tier="${tier}">
          <span class="material-symbols-outlined explorer__item-icon">${config.icon}</span>
          <div class="explorer__item-content">
            <div class="explorer__item-name">${config.name}</div>
            <div class="explorer__item-meta">Tier ${tier} - ${config.description}</div>
          </div>
          <span class="explorer__item-count">${count}</span>
          <span class="material-symbols-outlined explorer__item-arrow">chevron_right</span>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.explorer__item').forEach(item => {
      item.addEventListener('click', () => {
        this.selectedTier = parseInt(item.dataset.tier);
        this.selectedCategory = null;
        this.renderColumns();
      });
    });
  }

  renderColumns() {
    const columnsEl = this.container.querySelector('#explorer-columns');

    // Rebuild: Tier column + Category column + (optionally) Skills column
    let html = `
      <div class="explorer__column" id="tier-column">
        <div class="explorer__column-header">
          <span class="material-symbols-outlined explorer__column-header-icon">layers</span>
          Tiers
        </div>
        <div class="explorer__column-list" id="tier-list"></div>
      </div>
    `;

    if (this.selectedTier !== null) {
      html += `
        <div class="explorer__column" id="category-column">
          <div class="explorer__column-header">
            <span class="material-symbols-outlined explorer__column-header-icon">folder</span>
            Categories
          </div>
          <div class="explorer__column-list" id="category-list"></div>
        </div>
      `;
    }

    if (this.selectedCategory !== null) {
      html += `
        <div class="explorer__column" id="skill-column">
          <div class="explorer__column-header">
            <span class="material-symbols-outlined explorer__column-header-icon">build</span>
            Skills
          </div>
          <div class="explorer__column-list" id="skill-list"></div>
        </div>
      `;
    }

    columnsEl.innerHTML = html;

    // Re-render tier items
    this.renderTierItems();

    // Render category items
    if (this.selectedTier !== null) {
      this.renderCategoryItems();
    }

    // Render skill items
    if (this.selectedCategory !== null) {
      this.renderSkillItems();
    }

    // Update breadcrumb
    this.updateBreadcrumb();
  }

  renderTierItems() {
    const list = this.container.querySelector('#tier-list');
    if (!list) return;

    const tiers = [1, 2, 3];
    list.innerHTML = tiers.map(tier => {
      const config = TIER_CONFIG[tier];
      const count = this.skills.filter(s => s.tier === tier).length;
      return `
        <div class="explorer__item explorer__item--tier-${tier} ${this.selectedTier === tier ? 'explorer__item--selected' : ''}"
             data-tier="${tier}">
          <span class="material-symbols-outlined explorer__item-icon">${config.icon}</span>
          <div class="explorer__item-content">
            <div class="explorer__item-name">${config.name}</div>
            <div class="explorer__item-meta">Tier ${tier} - ${config.description}</div>
          </div>
          <span class="explorer__item-count">${count}</span>
          <span class="material-symbols-outlined explorer__item-arrow">chevron_right</span>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.explorer__item').forEach(item => {
      item.addEventListener('click', () => {
        this.selectedTier = parseInt(item.dataset.tier);
        this.selectedCategory = null;
        this.renderColumns();
      });
    });
  }

  renderCategoryItems() {
    const list = this.container.querySelector('#category-list');
    if (!list) return;

    const tierSkills = this.skills.filter(s => s.tier === this.selectedTier);
    const categories = [...new Set(tierSkills.map(s => s.category))].sort();

    list.innerHTML = categories.map(cat => {
      const count = tierSkills.filter(s => s.category === cat).length;
      return `
        <div class="explorer__item ${this.selectedCategory === cat ? 'explorer__item--selected' : ''}"
             data-category="${cat}">
          <span class="material-symbols-outlined explorer__item-icon">folder</span>
          <div class="explorer__item-content">
            <div class="explorer__item-name">${this.formatCategory(cat)}</div>
            <div class="explorer__item-meta">${count} skill${count !== 1 ? 's' : ''}</div>
          </div>
          <span class="explorer__item-count">${count}</span>
          <span class="material-symbols-outlined explorer__item-arrow">chevron_right</span>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.explorer__item').forEach(item => {
      item.addEventListener('click', () => {
        this.selectedCategory = item.dataset.category;
        this.renderColumns();
      });
    });
  }

  renderSkillItems() {
    const list = this.container.querySelector('#skill-list');
    if (!list) return;

    const filtered = this.skills.filter(
      s => s.tier === this.selectedTier && s.category === this.selectedCategory
    );

    list.innerHTML = filtered.map(skill => `
      <div class="explorer__item" data-skill-id="${skill.id}">
        <span class="material-symbols-outlined explorer__item-icon">build</span>
        <div class="explorer__item-content">
          <div class="explorer__item-name">${skill.name}</div>
          <div class="explorer__item-meta">${skill.owner}</div>
        </div>
        <span class="material-symbols-outlined explorer__item-arrow">chevron_right</span>
      </div>
    `).join('');

    list.querySelectorAll('.explorer__item').forEach(item => {
      item.addEventListener('click', () => {
        this.router.navigate(`/skill/${item.dataset.skillId}`);
      });
    });
  }

  updateBreadcrumb() {
    const bc = this.container.querySelector('#explorer-breadcrumb');
    let items = `
      <span class="material-symbols-outlined" style="font-size: 18px; color: var(--on-surface-muted);">home</span>
      <span class="explorer__breadcrumb-item ${!this.selectedTier ? 'explorer__breadcrumb-item--active' : ''}"
            id="bc-root">All Tiers</span>
    `;

    if (this.selectedTier) {
      items += `
        <span class="material-symbols-outlined explorer__breadcrumb-separator">chevron_right</span>
        <span class="explorer__breadcrumb-item ${!this.selectedCategory ? 'explorer__breadcrumb-item--active' : ''}"
              id="bc-tier">${TIER_CONFIG[this.selectedTier].name}</span>
      `;
    }

    if (this.selectedCategory) {
      items += `
        <span class="material-symbols-outlined explorer__breadcrumb-separator">chevron_right</span>
        <span class="explorer__breadcrumb-item explorer__breadcrumb-item--active"
              id="bc-category">${this.formatCategory(this.selectedCategory)}</span>
      `;
    }

    bc.innerHTML = items;

    // Bind breadcrumb navigation
    bc.querySelector('#bc-root')?.addEventListener('click', () => {
      this.selectedTier = null;
      this.selectedCategory = null;
      this.renderColumns();
    });

    bc.querySelector('#bc-tier')?.addEventListener('click', () => {
      this.selectedCategory = null;
      this.renderColumns();
    });
  }

  formatCategory(cat) {
    return cat.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  destroy() {
    this.container.innerHTML = '';
  }
}
