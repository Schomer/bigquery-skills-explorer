/**
 * BQ Skill Explorer — TopBar Component
 * Logo, skillset selector, Omnibox search, and user avatar.
 */

export class TopBar {
  constructor(container, { onSearch, onResultClick, searchEngine, onSkillsetChange, activeSkillset }) {
    this.container = container;
    this.onSearch = onSearch;
    this.onResultClick = onResultClick;
    this.searchEngine = searchEngine;
    this.onSkillsetChange = onSkillsetChange;
    this.activeSkillset = activeSkillset || 'bigquery';
    this.focusedIndex = -1;
    this.results = [];
    this.debounceTimer = null;
    this.menuOpen = false;

    this.render();
    this.bindEvents();
  }

  render() {
    const skillsetLabel = this.activeSkillset === 'bigquery' ? 'BigQuery Skills' : 'Data Agent Skills';
    const skillsetIcon = this.activeSkillset === 'bigquery' ? 'database' : 'smart_toy';

    this.container.innerHTML = `
      <div class="top-bar__logo">
        <span class="material-symbols-outlined top-bar__logo-icon">${skillsetIcon}</span>
        <span class="top-bar__title">Skill Explorer</span>
        <div class="top-bar__skillset-selector" id="skillset-selector">
          <button class="top-bar__skillset-btn" id="skillset-btn" aria-haspopup="true" aria-expanded="false">
            <span class="top-bar__skillset-label">${skillsetLabel}</span>
            <span class="material-symbols-outlined top-bar__skillset-arrow">expand_more</span>
          </button>
          <div class="top-bar__skillset-menu" id="skillset-menu">
            <div class="top-bar__skillset-menu-item ${this.activeSkillset === 'bigquery' ? 'top-bar__skillset-menu-item--active' : ''}"
                 data-skillset="bigquery">
              <span class="material-symbols-outlined" style="font-size: 20px; color: var(--google-blue);">database</span>
              <div class="top-bar__skillset-menu-content">
                <div class="top-bar__skillset-menu-name">BigQuery Skills</div>
                <div class="top-bar__skillset-menu-desc">SRE diagnostics, optimization, and monitoring</div>
              </div>
              ${this.activeSkillset === 'bigquery' ? '<span class="material-symbols-outlined" style="font-size: 18px; color: var(--google-blue);">check</span>' : ''}
            </div>
            <div class="top-bar__skillset-menu-item ${this.activeSkillset === 'data-agent' ? 'top-bar__skillset-menu-item--active' : ''}"
                 data-skillset="data-agent">
              <span class="material-symbols-outlined" style="font-size: 20px; color: var(--google-green);">smart_toy</span>
              <div class="top-bar__skillset-menu-content">
                <div class="top-bar__skillset-menu-name">Data Agent Skills</div>
                <div class="top-bar__skillset-menu-desc">Antigravity agent skills for data development</div>
              </div>
              ${this.activeSkillset === 'data-agent' ? '<span class="material-symbols-outlined" style="font-size: 18px; color: var(--google-blue);">check</span>' : ''}
            </div>
            <div class="top-bar__skillset-menu-divider"></div>
            <div class="top-bar__skillset-menu-footer">
              <span class="material-symbols-outlined" style="font-size: 16px;">info</span>
              Source: <a href="https://source.corp.google.com/piper///depot/google3/cloud/developer_experience/datacloud_vscode/antigravity/skills/" target="_blank" rel="noopener">Antigravity Skills</a>
            </div>
          </div>
        </div>
      </div>
      <div class="top-bar__search" id="global-search">
        <div class="top-bar__search-input-wrapper">
          <span class="material-symbols-outlined top-bar__search-icon">search</span>
          <input
            type="text"
            class="top-bar__search-input"
            id="omnibox-input"
            placeholder="Search skills, docs, assets..."
            autocomplete="off"
          />
        </div>
        <div class="search-dropdown" id="search-dropdown"></div>
      </div>
      <div class="top-bar__actions">
        <button class="btn--icon" title="Help" aria-label="Help">
          <span class="material-symbols-outlined">help_outline</span>
        </button>
        <div class="top-bar__avatar" title="User" aria-label="User profile">E</div>
      </div>
    `;
  }

  bindEvents() {
    const input = this.container.querySelector('#omnibox-input');

    input.addEventListener('input', (e) => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.handleInput(e.target.value);
      }, 150);
    });

    input.addEventListener('focus', () => {
      if (input.value.trim().length >= 2) {
        this.showDropdown();
      }
    });

    input.addEventListener('keydown', (e) => {
      this.handleKeydown(e);
    });

    // Click outside to close search
    document.addEventListener('click', (e) => {
      const search = this.container.querySelector('#global-search');
      if (search && !search.contains(e.target)) {
        this.hideDropdown();
      }
    });

    // Skillset selector
    const selectorBtn = this.container.querySelector('#skillset-btn');
    const selectorMenu = this.container.querySelector('#skillset-menu');

    selectorBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.menuOpen = !this.menuOpen;
      selectorMenu.classList.toggle('top-bar__skillset-menu--visible', this.menuOpen);
      selectorBtn.setAttribute('aria-expanded', this.menuOpen);
    });

    // Menu item clicks
    this.container.querySelectorAll('.top-bar__skillset-menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const skillset = item.dataset.skillset;
        if (skillset && skillset !== this.activeSkillset) {
          this.activeSkillset = skillset;
          this.menuOpen = false;
          selectorMenu.classList.remove('top-bar__skillset-menu--visible');
          this.render();
          this.bindEvents();
          if (this.onSkillsetChange) {
            this.onSkillsetChange(skillset);
          }
        } else {
          this.menuOpen = false;
          selectorMenu.classList.remove('top-bar__skillset-menu--visible');
        }
      });
    });

    // Click outside to close menu
    document.addEventListener('click', (e) => {
      const selector = this.container.querySelector('#skillset-selector');
      if (selector && !selector.contains(e.target)) {
        this.menuOpen = false;
        selectorMenu?.classList.remove('top-bar__skillset-menu--visible');
      }
    });
  }

  handleInput(query) {
    if (query.trim().length < 2) {
      this.hideDropdown();
      return;
    }

    this.results = this.searchEngine.search(query);
    this.focusedIndex = -1;
    this.renderDropdown();
    this.showDropdown();
  }

  handleKeydown(e) {
    const dropdown = this.container.querySelector('#search-dropdown');
    const isVisible = dropdown.classList.contains('search-dropdown--visible');

    if (e.key === 'Escape') {
      this.hideDropdown();
      return;
    }

    if (!isVisible || this.results.length === 0) {
      if (e.key === 'Enter') {
        this.onSearch(e.target.value);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.focusedIndex = Math.min(this.focusedIndex + 1, this.results.length - 1);
      this.updateFocus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.focusedIndex = Math.max(this.focusedIndex - 1, -1);
      this.updateFocus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (this.focusedIndex >= 0) {
        this.onResultClick(this.results[this.focusedIndex].skillId);
        this.hideDropdown();
      } else {
        this.onSearch(e.target.value);
      }
    }
  }

  renderDropdown() {
    const dropdown = this.container.querySelector('#search-dropdown');

    if (this.results.length === 0) {
      dropdown.innerHTML = `
        <div class="search-dropdown__empty">
          No results found
        </div>
      `;
      return;
    }

    // Group by field
    const groups = {};
    for (const r of this.results) {
      if (!groups[r.field]) groups[r.field] = [];
      groups[r.field].push(r);
    }

    let html = '';
    for (const [field, items] of Object.entries(groups)) {
      html += `<div class="search-dropdown__group">`;
      html += `<div class="search-dropdown__group-label">${field}</div>`;
      for (const item of items) {
        const idx = this.results.indexOf(item);
        html += `
          <div class="search-dropdown__item" data-index="${idx}" data-skill-id="${item.skillId}">
            <span class="material-symbols-outlined search-dropdown__item-icon">${item.icon}</span>
            <div class="search-dropdown__item-content">
              <div class="search-dropdown__item-name">${item.displayName}</div>
              <div class="search-dropdown__item-context">${item.highlight}</div>
            </div>
          </div>
        `;
      }
      html += `</div>`;
    }

    dropdown.innerHTML = html;

    // Bind click events
    dropdown.querySelectorAll('.search-dropdown__item').forEach(el => {
      el.addEventListener('click', () => {
        this.onResultClick(el.dataset.skillId);
        this.hideDropdown();
        this.container.querySelector('#omnibox-input').value = '';
      });
    });
  }

  updateFocus() {
    const items = this.container.querySelectorAll('.search-dropdown__item');
    items.forEach((el, i) => {
      el.classList.toggle('search-dropdown__item--focused', i === this.focusedIndex);
    });
  }

  showDropdown() {
    this.container.querySelector('#search-dropdown')?.classList.add('search-dropdown--visible');
  }

  hideDropdown() {
    this.container.querySelector('#search-dropdown')?.classList.remove('search-dropdown--visible');
    this.focusedIndex = -1;
  }
}
