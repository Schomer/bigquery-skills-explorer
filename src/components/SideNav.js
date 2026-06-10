/**
 * BQ Skill Explorer — Side Navigation Rail
 * Material Design 3 nav rail with icon + label items.
 */

export class SideNav {
  constructor(container, { router }) {
    this.container = container;
    this.router = router;

    this.routes = [
      { path: '/explorer', icon: 'account_tree', label: 'Explorer' },
      { path: '/graph', icon: 'hub', label: 'Graph' },
      { path: '/mapper', icon: 'science', label: 'Test' },
      { path: '/dashboard', icon: 'monitor_heart', label: 'Dashboard' },
    ];

    this.render();
    this.bindEvents();

    // Update active state on hash change
    window.addEventListener('hashchange', () => this.updateActive());
    this.updateActive();
  }

  render() {
    this.container.innerHTML = this.routes.map(route => `
      <a class="side-nav__item" href="#${route.path}" data-path="${route.path}" title="${route.label}">
        <div class="side-nav__indicator"></div>
        <span class="material-symbols-outlined side-nav__icon">${route.icon}</span>
        <span class="side-nav__label">${route.label}</span>
      </a>
    `).join('');
  }

  bindEvents() {
    this.container.querySelectorAll('.side-nav__item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        this.router.navigate(item.dataset.path);
      });
    });
  }

  updateActive() {
    const hash = window.location.hash.slice(1) || '/explorer';
    this.container.querySelectorAll('.side-nav__item').forEach(item => {
      const isActive = hash.startsWith(item.dataset.path);
      item.classList.toggle('side-nav__item--active', isActive);
    });
  }
}
