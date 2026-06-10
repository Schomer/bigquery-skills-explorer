/**
 * BQ Skill Explorer — TopBar Component
 * Logo, Omnibox search, and user avatar.
 */

export class TopBar {
  constructor(container, { onSearch, onResultClick, searchEngine }) {
    this.container = container;
    this.onSearch = onSearch;
    this.onResultClick = onResultClick;
    this.searchEngine = searchEngine;
    this.focusedIndex = -1;
    this.results = [];
    this.debounceTimer = null;

    this.render();
    this.bindEvents();
  }

  render() {
    this.container.innerHTML = `
      <div class="top-bar__logo">
        <span class="material-symbols-outlined top-bar__logo-icon">database</span>
        <span class="top-bar__title">BQ Skill Explorer</span>
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
    const dropdown = this.container.querySelector('#search-dropdown');

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

    // Click outside to close
    document.addEventListener('click', (e) => {
      if (!this.container.querySelector('#global-search').contains(e.target)) {
        this.hideDropdown();
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
    this.container.querySelector('#search-dropdown').classList.add('search-dropdown--visible');
  }

  hideDropdown() {
    this.container.querySelector('#search-dropdown').classList.remove('search-dropdown--visible');
    this.focusedIndex = -1;
  }
}
