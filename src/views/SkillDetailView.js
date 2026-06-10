/**
 * BQ Skill Explorer — Skill Detail View (Man Page)
 * Shows skill documentation, metadata, and inline file viewer.
 */

import { marked } from 'marked';
import hljs from 'highlight.js';
import { renderBreadcrumb, getSkillsetLabel } from '../components/Breadcrumb.js';

const ASSET_ICONS = {
  python: 'code',
  py: 'code',
  sql: 'storage',
  json: 'data_object',
  md: 'description',
  markdown: 'description',
  yaml: 'settings',
  yml: 'settings',
  bzl: 'build',
  sh: 'terminal',
  txt: 'article',
  bazel: 'build',
};

const LANG_MAP = {
  python: 'python',
  py: 'python',
  sql: 'sql',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  sh: 'bash',
  bzl: 'python',
  bazel: 'python',
  md: 'markdown',
  markdown: 'markdown',
  txt: 'plaintext',
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
    this.activeSkillset = deps.activeSkillset || 'data-agent';
    this.activeAssetIndex = null;

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
          ${renderBreadcrumb([
            { label: getSkillsetLabel(this.activeSkillset), icon: 'inventory_2', path: '/explorer' },
            { label: 'Explorer', icon: 'account_tree', path: '/explorer' },
            { label: skill.name },
          ])}
          <div class="skill-detail__header">
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

          ${skill.assets?.length ? `
            <div class="skill-detail__files-section">
              <h2 class="skill-detail__section-title">
                <span class="material-symbols-outlined" style="color: var(--google-blue);">folder_open</span>
                Files (${skill.assets.length})
              </h2>
              <div class="skill-detail__file-list" id="file-list">
                ${skill.assets.map((asset, idx) => `
                  <div class="skill-detail__file-item ${idx === 0 ? 'skill-detail__file-item--active' : ''}"
                       data-asset-index="${idx}">
                    <span class="material-symbols-outlined skill-detail__file-icon">${ASSET_ICONS[asset.type] || 'insert_drive_file'}</span>
                    <span class="skill-detail__file-name">${asset.name}</span>
                    <span class="skill-detail__file-type">${asset.type}</span>
                  </div>
                `).join('')}
              </div>
              <div class="skill-detail__file-viewer" id="file-viewer">
                ${this.renderFileContent(skill.assets[0], 0)}
              </div>
            </div>
          ` : ''}
        </div>
        <div class="skill-detail__sidebar">
          ${this.renderMetadataCard(skill)}
          ${this.renderIOCard(skill)}
          ${this.renderRoutersCard(relatedRouters)}
        </div>
      </div>
    `;

    this.activeAssetIndex = skill.assets?.length ? 0 : null;
    this.bindEvents();
  }

  renderFileContent(asset, index) {
    if (!asset) return '';

    const lang = LANG_MAP[asset.type] || 'plaintext';
    const isMarkdown = asset.type === 'md' || asset.type === 'markdown';

    let contentHtml;
    if (isMarkdown) {
      contentHtml = `
        <div class="skill-detail__file-rendered-md">
          ${marked.parse(asset.content || '')}
        </div>
      `;
    } else {
      let highlighted;
      try {
        highlighted = hljs.highlight(asset.content || '', { language: lang }).value;
      } catch {
        highlighted = hljs.highlightAuto(asset.content || '').value;
      }
      contentHtml = `<pre class="skill-detail__file-code"><code class="hljs language-${lang}">${highlighted}</code></pre>`;
    }

    const lineCount = (asset.content || '').split('\n').length;
    const byteSize = new Blob([asset.content || '']).size;

    return `
      <div class="skill-detail__file-header">
        <div class="skill-detail__file-header-left">
          <span class="material-symbols-outlined" style="font-size: 18px; color: var(--on-surface-variant);">${ASSET_ICONS[asset.type] || 'insert_drive_file'}</span>
          <span class="skill-detail__file-header-name">${asset.name}</span>
        </div>
        <div class="skill-detail__file-header-right">
          <span class="skill-detail__file-stat">${lineCount} lines</span>
          <span class="skill-detail__file-stat">${this.formatBytes(byteSize)}</span>
          <span class="chip" style="font-size: 11px; padding: 2px 8px;">${lang}</span>
        </div>
      </div>
      <div class="skill-detail__file-body">
        ${contentHtml}
      </div>
    `;
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
          ${skill.source_path ? `
            <div class="skill-detail__meta-item">
              <span class="material-symbols-outlined skill-detail__meta-icon">link</span>
              <div>
                <div class="skill-detail__meta-label">Source</div>
                <div class="skill-detail__meta-value"><a href="${skill.source_path}" target="_blank" rel="noopener" style="color: var(--google-blue); font-size: var(--font-size-xs); word-break: break-all;">${skill.id}/</a></div>
              </div>
            </div>
          ` : ''}
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
    // File item clicks — show content inline
    this.container.querySelectorAll('.skill-detail__file-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.assetIndex);
        if (idx === this.activeAssetIndex) return;

        this.activeAssetIndex = idx;
        const asset = this.skill.assets[idx];

        // Update active state
        this.container.querySelectorAll('.skill-detail__file-item').forEach(item =>
          item.classList.remove('skill-detail__file-item--active')
        );
        el.classList.add('skill-detail__file-item--active');

        // Render file content
        const viewer = this.container.querySelector('#file-viewer');
        if (viewer && asset) {
          viewer.innerHTML = this.renderFileContent(asset, idx);
        }
      });
    });

    // Router links
    this.container.querySelectorAll('.skill-detail__router-link').forEach(el => {
      el.addEventListener('click', () => {
        this.router.navigate('/graph');
      });
    });
  }

  formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
