/**
 * BQ Skill Explorer — Health & Changelog Dashboard
 */

export class DashboardView {
  /**
   * @param {HTMLElement} container
   * @param {{ skills: Array, metaSkillRouters: Array, router: import('../router.js').Router }} deps
   */
  constructor(container, deps) {
    this.container = container;
    this.skills = deps.skills;
    this.metaSkillRouters = deps.metaSkillRouters;
    this.router = deps.router;
    this.activeFilter = null;

    this.computeMetrics();
    this.render();
  }

  computeMetrics() {
    this.totalSkills = this.skills.length;
    this.missingDocs = this.skills.filter(s => !s.has_skill_md);
    this.missingExamples = this.skills.filter(s => !s.has_example_queries);

    // Tier distribution
    this.tierCounts = { 1: 0, 2: 0, 3: 0 };
    this.skills.forEach(s => { this.tierCounts[s.tier] = (this.tierCounts[s.tier] || 0) + 1; });

    // Unrouted skills
    const routedSkillIds = new Set();
    this.metaSkillRouters.forEach(r => r.sub_skills.forEach(id => routedSkillIds.add(id)));
    this.unroutedSkills = this.skills.filter(s => !routedSkillIds.has(s.id));

    // Recently updated (sorted by date desc)
    this.recentlyUpdated = [...this.skills]
      .filter(s => s.last_updated)
      .sort((a, b) => b.last_updated.localeCompare(a.last_updated))
      .slice(0, 10);
  }

  render() {
    const tierTotal = this.tierCounts[1] + this.tierCounts[2] + this.tierCounts[3];

    this.container.innerHTML = `
      <div class="dashboard view-enter">
        <h1 class="dashboard__title">
          <span class="material-symbols-outlined dashboard__title-icon">monitor_heart</span>
          Health & Changelog Dashboard
        </h1>

        <!-- Metric Cards -->
        <div class="dashboard__metrics">
          <div class="dashboard__metric-card dashboard__metric-card--info" data-filter="total">
            <div class="dashboard__metric-header">
              <span class="material-symbols-outlined dashboard__metric-icon">functions</span>
            </div>
            <div class="dashboard__metric-value">${this.totalSkills}</div>
            <div class="dashboard__metric-label">Total Skills</div>
          </div>

          <div class="dashboard__metric-card ${this.missingDocs.length > 0 ? 'dashboard__metric-card--warning' : 'dashboard__metric-card--healthy'}"
               data-filter="missing-docs">
            <div class="dashboard__metric-header">
              <span class="material-symbols-outlined dashboard__metric-icon">warning</span>
            </div>
            <div class="dashboard__metric-value">${this.missingDocs.length}</div>
            <div class="dashboard__metric-label">Missing Documentation</div>
          </div>

          <div class="dashboard__metric-card ${this.missingExamples.length > 0 ? 'dashboard__metric-card--warning' : 'dashboard__metric-card--healthy'}"
               data-filter="missing-examples">
            <div class="dashboard__metric-header">
              <span class="material-symbols-outlined dashboard__metric-icon">warning</span>
            </div>
            <div class="dashboard__metric-value">${this.missingExamples.length}</div>
            <div class="dashboard__metric-label">Missing Example Queries</div>
          </div>

          <div class="dashboard__metric-card ${this.unroutedSkills.length > 0 ? 'dashboard__metric-card--critical' : 'dashboard__metric-card--healthy'}"
               data-filter="unrouted">
            <div class="dashboard__metric-header">
              <span class="material-symbols-outlined dashboard__metric-icon">link_off</span>
            </div>
            <div class="dashboard__metric-value">${this.unroutedSkills.length}</div>
            <div class="dashboard__metric-label">Unrouted Skills</div>
          </div>

          <div class="dashboard__metric-card dashboard__metric-card--info" data-filter="distribution">
            <div class="dashboard__metric-header">
              <span class="material-symbols-outlined dashboard__metric-icon">bar_chart</span>
            </div>
            <div class="dashboard__metric-value">${tierTotal}</div>
            <div class="dashboard__metric-label">Tier Distribution</div>
            <div class="dashboard__tier-bar">
              <div class="dashboard__tier-segment dashboard__tier-segment--1" style="flex: ${this.tierCounts[1]}"></div>
              <div class="dashboard__tier-segment dashboard__tier-segment--2" style="flex: ${this.tierCounts[2]}"></div>
              <div class="dashboard__tier-segment dashboard__tier-segment--3" style="flex: ${this.tierCounts[3]}"></div>
            </div>
            <div class="dashboard__tier-labels">
              <span class="dashboard__tier-label">
                <span class="dashboard__tier-dot" style="background-color: var(--google-red)"></span>
                T1: ${this.tierCounts[1]}
              </span>
              <span class="dashboard__tier-label">
                <span class="dashboard__tier-dot" style="background-color: var(--google-yellow)"></span>
                T2: ${this.tierCounts[2]}
              </span>
              <span class="dashboard__tier-label">
                <span class="dashboard__tier-dot" style="background-color: var(--google-green)"></span>
                T3: ${this.tierCounts[3]}
              </span>
            </div>
          </div>
        </div>

        <!-- Filter Results (dynamic) -->
        <div id="dashboard-filter-results"></div>

        <!-- Recently Updated -->
        <div class="dashboard__section">
          <h2 class="dashboard__section-title">
            <span class="material-symbols-outlined" style="color: var(--google-blue);">update</span>
            Recently Updated
          </h2>
          <table class="dashboard__table">
            <thead>
              <tr>
                <th>Skill Name</th>
                <th>Owner</th>
                <th>Tier</th>
                <th>Category</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              ${this.recentlyUpdated.map(skill => `
                <tr>
                  <td>
                    <span class="dashboard__table-link" data-skill-id="${skill.id}">${skill.name}</span>
                  </td>
                  <td>${skill.owner}</td>
                  <td><span class="tier-badge tier-badge--${skill.tier}">T${skill.tier}</span></td>
                  <td>${this.formatCategory(skill.category)}</td>
                  <td>${skill.last_updated}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    // Metric card clicks
    this.container.querySelectorAll('.dashboard__metric-card').forEach(card => {
      card.addEventListener('click', () => {
        const filter = card.dataset.filter;
        if (this.activeFilter === filter) {
          this.activeFilter = null;
          this.container.querySelectorAll('.dashboard__metric-card').forEach(c =>
            c.classList.remove('dashboard__metric-card--active')
          );
          this.container.querySelector('#dashboard-filter-results').innerHTML = '';
          return;
        }

        this.activeFilter = filter;
        this.container.querySelectorAll('.dashboard__metric-card').forEach(c =>
          c.classList.remove('dashboard__metric-card--active')
        );
        card.classList.add('dashboard__metric-card--active');
        this.showFilterResults(filter);
      });
    });

    // Table links
    this.container.querySelectorAll('.dashboard__table-link').forEach(link => {
      link.addEventListener('click', () => {
        this.router.navigate(`/skill/${link.dataset.skillId}`);
      });
    });
  }

  showFilterResults(filter) {
    const target = this.container.querySelector('#dashboard-filter-results');
    let skills = [];
    let title = '';
    let icon = '';

    switch (filter) {
      case 'total':
        skills = this.skills;
        title = 'All Skills';
        icon = 'functions';
        break;
      case 'missing-docs':
        skills = this.missingDocs;
        title = 'Skills Missing Documentation';
        icon = 'warning';
        break;
      case 'missing-examples':
        skills = this.missingExamples;
        title = 'Skills Missing Example Queries';
        icon = 'warning';
        break;
      case 'unrouted':
        skills = this.unroutedSkills;
        title = 'Unrouted Skills';
        icon = 'link_off';
        break;
      case 'distribution':
        // Show all with tier grouping
        skills = this.skills;
        title = 'Tier Distribution';
        icon = 'bar_chart';
        break;
      default:
        return;
    }

    if (skills.length === 0) {
      target.innerHTML = `
        <div class="dashboard__filtered">
          <div class="dashboard__filtered-title">
            <span class="material-symbols-outlined" style="font-size: 18px;">${icon}</span>
            ${title}
          </div>
          <div class="empty-state" style="padding: var(--space-24);">
            <span class="material-symbols-outlined empty-state__icon">check_circle</span>
            <div class="empty-state__title">All clear</div>
            <div class="empty-state__description">No issues found in this category.</div>
          </div>
        </div>
      `;
      return;
    }

    target.innerHTML = `
      <div class="dashboard__filtered">
        <div class="dashboard__filtered-title">
          <span class="material-symbols-outlined" style="font-size: 18px;">${icon}</span>
          ${title} (${skills.length})
        </div>
        <div class="dashboard__filtered-list">
          ${skills.map(skill => `
            <div class="dashboard__filtered-item" data-skill-id="${skill.id}">
              <span class="material-symbols-outlined" style="color: var(--on-surface-variant);">build</span>
              <span style="flex: 1; font-weight: 500;">${skill.name}</span>
              <span class="tier-badge tier-badge--${skill.tier}">T${skill.tier}</span>
              <span style="color: var(--on-surface-muted); font-size: var(--font-size-sm);">${skill.owner}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Bind click events
    target.querySelectorAll('.dashboard__filtered-item').forEach(item => {
      item.addEventListener('click', () => {
        this.router.navigate(`/skill/${item.dataset.skillId}`);
      });
    });
  }

  formatCategory(cat) {
    return cat.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  destroy() {
    this.container.innerHTML = '';
  }
}
