/**
 * BQ Skill Explorer — Breadcrumb Utility
 * Generates a consistent breadcrumb bar across all views.
 */

const SKILLSET_LABELS = {
  'bigquery': 'BigQuery Skills',
  'data-agent': 'Data Agent Kit',
  'google-cloud': 'Google Cloud Skills',
};

/**
 * Get the display label for a skillset ID.
 * @param {string} skillsetId
 * @returns {string}
 */
export function getSkillsetLabel(skillsetId) {
  return SKILLSET_LABELS[skillsetId] || 'Skills';
}

/**
 * Render a breadcrumb HTML string.
 * @param {Array<{label: string, icon?: string, path?: string}>} items - Breadcrumb segments.
 *   The last item is always rendered as active (no link). Items with a `path` are clickable.
 * @returns {string} HTML string
 */
export function renderBreadcrumb(items) {
  return `
    <div class="breadcrumb">
      ${items.map((item, index) => {
        const isLast = index === items.length - 1;
        const separator = index > 0
          ? '<span class="material-symbols-outlined breadcrumb__separator">chevron_right</span>'
          : '';

        if (isLast) {
          return `
            ${separator}
            ${item.icon ? `<span class="material-symbols-outlined breadcrumb__icon">${item.icon}</span>` : ''}
            <span class="breadcrumb__item breadcrumb__item--active">${item.label}</span>
          `;
        }

        if (item.path) {
          return `
            ${separator}
            ${item.icon ? `<span class="material-symbols-outlined breadcrumb__icon">${item.icon}</span>` : ''}
            <a class="breadcrumb__item breadcrumb__item--link" href="#${item.path}">${item.label}</a>
          `;
        }

        return `
          ${separator}
          ${item.icon ? `<span class="material-symbols-outlined breadcrumb__icon">${item.icon}</span>` : ''}
          <span class="breadcrumb__item">${item.label}</span>
        `;
      }).join('')}
    </div>
  `;
}
