/**
 * BQ Skill Explorer — Skill Detail View (Man Page)
 */

import { marked } from 'marked';
import { codeViewer } from '../components/CodeViewerModal.js';

const ASSET_ICONS = {
  python: 'code',
  py: 'code',
  sql: 'storage',
  json: 'data_object',
  md: 'description',
  markdown: 'description',
};

export class SkillDetailView {
  /**
   * @param {HTMLElement} container
   * @param {{ skill: object, skills: Array, metaSkillRouters: Array, router: import('../router.js').Router }} deps
   */
  constructor(container, deps) {
    this.container = container;
    this.skill = deps.skill;
    this.skills = deps.skills;
    this.metaSkillRouters = deps.metaSkillRouters;
    this.router = deps.router;

    this.render();
  }

  render() {
    const skill = this.skill;

    if (!skill) {
      this.container.innerHTML = `
        <div class="empty-state view-enter">
          <span class="material-symbols-outlined empty-state__icon">search_off</span>
          <div class="empty-state__title">Skill not found</div>
          <div class="empty-state__description">The requested skill could not be found in the library.</div>
        </div>
      `;
      return;
    }

    // Parse markdown documentation
    const docHtml = marked.parse(skill.documentation || '_No documentation available._');

    // Build related routers
    const relatedRouters = this.metaSkillRouters.filter(
      r => skill.meta_skill_routers?.includes(r.id)
    );

    this.container.innerHTML = `
      <div class="skill-detail view-enter">
        <div class="skill-detail__main">
          <div class="skill-detail__header">
            <button class="skill-detail__back" id="detail-back">
              <span class="material-symbols-outlined" style="font-size: 18px;">arrow_back</span>
              Back to Explorer
            </button>
            <h1 class="skill-detail__title">${skill.name}</h1>
            <p class="skill-detail__description">${skill.description}</p>
            <div class="skill-detail__tags">
              <span class="tier-badge tier-badge--${skill.tier}">Tier ${skill.tier}</span>
              <span class="chip">${this.formatCategory(skill.category)}</span>
              <span class="chip chip--blue">
                <span class="material-symbols-outlined" style="font-size: 14px;">group</span>
                ${skill.owner}
              </span>
              ${skill.last_updated ? `<span class="chip">Updated ${skill.last_updated}</span>` : ''}
            </div>
          </div>
          <div class="skill-detail__docs">${docHtml}</div>
        </div>
        <div class="skill-detail__sidebar">
          ${this.renderMetadataCard(skill)}
          ${this.renderIOCard(skill)}
          ${this.renderAssetsCard(skill)}
          ${this.renderRoutersCard(relatedRouters)}
        </div>
      </div>
    `;

    this.bindEvents();
  }

  renderMetadataCard(skill) {
    return `
      <div class="card">
        <div class="card__title">
          <span class="material-symbols-outlined card__title-icon">info</span>
          Overview
        </div>
        <div class="skill-detail__meta-list">
          <div class="skill-detail__meta-item">
            <span class="material-symbols-outlined skill-detail__meta-icon">group</span>
            <div>
              <div class="skill-detail__meta-label">Owner</div>
              <div class="skill-detail__meta-value">${skill.owner}</div>
            </div>
          </div>
          <div class="skill-detail__meta-item">
            <span class="material-symbols-outlined skill-detail__meta-icon">layers</span>
            <div>
              <div class="skill-detail__meta-label">Tier</div>
              <div class="skill-detail__meta-value">${this.getTierName(skill.tier)} (Tier ${skill.tier})</div>
            </div>
          </div>
          <div class="skill-detail__meta-item">
            <span class="material-symbols-outlined skill-detail__meta-icon">folder</span>
            <div>
              <div class="skill-detail__meta-label">Category</div>
              <div class="skill-detail__meta-value">${this.formatCategory(skill.category)}</div>
            </div>
          </div>
          <div class="skill-detail__meta-item">
            <span class="material-symbols-outlined skill-detail__meta-icon">calendar_today</span>
            <div>
              <div class="skill-detail__meta-label">Last Updated</div>
              <div class="skill-detail__meta-value">${skill.last_updated || 'Unknown'}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderIOCard(skill) {
    if (!skill.inputs?.length && !skill.outputs?.length) return '';

    return `
      <div class="card">
        <div class="card__title">
          <span class="material-symbols-outlined card__title-icon">swap_horiz</span>
          Inputs / Outputs
        </div>
        ${skill.inputs?.length ? `
          <div style="margin-bottom: var(--space-12);">
            <div class="skill-detail__meta-label" style="margin-bottom: var(--space-6);">
              <span class="material-symbols-outlined" style="font-size: 14px; vertical-align: text-bottom;">input</span>
              Inputs
            </div>
            <div class="skill-detail__io-list">
              ${skill.inputs.map(i => `<span class="skill-detail__io-tag skill-detail__io-tag--input">${i}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        ${skill.outputs?.length ? `
          <div>
            <div class="skill-detail__meta-label" style="margin-bottom: var(--space-6);">
              <span class="material-symbols-outlined" style="font-size: 14px; vertical-align: text-bottom;">output</span>
              Outputs
            </div>
            <div class="skill-detail__io-list">
              ${skill.outputs.map(o => `<span class="skill-detail__io-tag skill-detail__io-tag--output">${o}</span>`).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  renderAssetsCard(skill) {
    if (!skill.assets?.length) return '';

    return `
      <div class="card">
        <div class="card__title">
          <span class="material-symbols-outlined card__title-icon">code</span>
          Assets (${skill.assets.length})
        </div>
        ${skill.assets.map((asset, idx) => `
          <div class="skill-detail__asset" data-asset-index="${idx}">
            <span class="material-symbols-outlined skill-detail__asset-icon">${ASSET_ICONS[asset.type] || 'insert_drive_file'}</span>
            <span class="skill-detail__asset-name">${asset.name}</span>
            <span class="skill-detail__asset-type">${asset.type}</span>
            <span class="material-symbols-outlined" style="font-size: 18px; color: var(--on-surface-muted);">open_in_new</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderRoutersCard(routers) {
    if (!routers.length) return '';

    return `
      <div class="card">
        <div class="card__title">
          <span class="material-symbols-outlined card__title-icon">hub</span>
          Meta-Skill Routers
        </div>
        ${routers.map(r => `
          <div class="skill-detail__router-link" data-router-id="${r.id}">
            <span class="material-symbols-outlined" style="font-size: 18px;">hub</span>
            ${r.name}
          </div>
        `).join('')}
      </div>
    `;
  }

  bindEvents() {
    // Back button
    this.container.querySelector('#detail-back')?.addEventListener('click', () => {
      this.router.navigate('/explorer');
    });

    // Asset clicks
    this.container.querySelectorAll('.skill-detail__asset').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.assetIndex);
        const asset = this.skill.assets[idx];
        if (asset) codeViewer.open(asset);
      });
    });

    // Router links
    this.container.querySelectorAll('.skill-detail__router-link').forEach(el => {
      el.addEventListener('click', () => {
        this.router.navigate('/graph');
      });
    });
  }

  getTierName(tier) {
    const names = { 1: 'Infrastructure', 2: 'Components', 3: 'Playbooks' };
    return names[tier] || `Tier ${tier}`;
  }

  formatCategory(cat) {
    return cat.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  destroy() {
    this.container.innerHTML = '';
  }
}
