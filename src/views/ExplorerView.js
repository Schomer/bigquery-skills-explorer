/**
 * BQ Skill Explorer — Explorer View (3-Column Finder)
 */

import { renderBreadcrumb, getSkillsetLabel } from '../components/Breadcrumb.js';

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
    this.activeSkillset = deps.activeSkillset || 'data-agent';

    this.selectedTier = null;
    this.selectedCategory = null;

    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="explorer view-enter">
        <div id="explorer-breadcrumb">
          ${this.getBreadcrumbHtml()}
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

  getBreadcrumbHtml() {
    const items = [
      { label: getSkillsetLabel(this.activeSkillset), icon: 'inventory_2' },
      { label: 'Explorer', icon: 'account_tree', path: this.selectedTier ? '/explorer' : null },
    ];

    if (this.selectedTier) {
      if (this.selectedCategory) {
        items.push({ label: TIER_CONFIG[this.selectedTier].name });
      } else {
        items.push({ label: TIER_CONFIG[this.selectedTier].name });
      }
    }

    if (this.selectedCategory) {
      items.push({ label: this.formatCategory(this.selectedCategory) });
    }

    return renderBreadcrumb(items);
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

    this.renderTierItems();

    if (this.selectedTier !== null) {
      this.renderCategoryItems();
    }

    if (this.selectedCategory !== null) {
      this.renderSkillItems();
    }

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
    bc.innerHTML = this.getBreadcrumbHtml();

    // Bind breadcrumb click on the Explorer link to reset
    const explorerLink = bc.querySelector('a[href="#/explorer"]');
    if (explorerLink) {
      explorerLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.selectedTier = null;
        this.selectedCategory = null;
        this.renderColumns();
      });
    }
  }

  formatCategory(cat) {
    return cat.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  destroy() {
    this.container.innerHTML = '';
  }
}
