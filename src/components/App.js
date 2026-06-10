/**
 * BQ Skill Explorer — App Root Component
 * Mounts TopBar, SideNav, and ViewContainer.
 */

import { TopBar } from './TopBar.js';
import { SideNav } from './SideNav.js';

export class App {
  /**
   * @param {HTMLElement} container
   * @param {{ router: import('../router.js').Router, data: object, searchEngine: import('../search.js').SearchEngine }} deps
   */
  constructor(container, deps) {
    this.container = container;
    this.router = deps.router;
    this.data = deps.data;
    this.searchEngine = deps.searchEngine;

    this.render();
    this.topBar = new TopBar(
      this.container.querySelector('.top-bar'),
      {
        onSearch: (q) => this.handleSearch(q),
        onResultClick: (skillId) => this.router.navigate(`/skill/${skillId}`),
        searchEngine: this.searchEngine,
      }
    );
    this.sideNav = new SideNav(
      this.container.querySelector('.side-nav'),
      { router: this.router }
    );

    this.viewContainer = this.container.querySelector('.view-container');
  }

  render() {
    this.container.innerHTML = `
      <header class="top-bar"></header>
      <nav class="side-nav"></nav>
      <main class="view-container"></main>
    `;
  }

  handleSearch(query) {
    // Navigate to mapper with pre-filled query
    if (query) {
      this.router.navigate(`/mapper?q=${encodeURIComponent(query)}`);
    }
  }

  getViewContainer() {
    return this.viewContainer;
  }
}
