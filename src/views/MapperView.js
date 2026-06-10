/**
 * BQ Skill Explorer — Skill Routing Test View
 * Enter any data-oriented prompt and see which skills the routing system would invoke.
 */

import { renderBreadcrumb } from '../components/Breadcrumb.js';

export class MapperView {
  /**
   * @param {HTMLElement} container
   * @param {{ skills: Array, metaSkillRouters: Array, router: import('../router.js').Router, initialQuery?: string }} deps
   */
  constructor(container, deps) {
    this.container = container;
    this.skills = deps.skills;
    this.metaSkillRouters = deps.metaSkillRouters || [];
    this.router = deps.router;
    this.query = deps.initialQuery || '';

    // Build keyword index for smarter matching
    this.buildKeywordIndex();

    this.render();
    if (this.query) {
      this.container.querySelector('#mapper-input').value = this.query;
      this.analyzePrompt(this.query);
    }
  }

  buildKeywordIndex() {
    // Extract meaningful keywords from each skill for weighted matching
    this.skillKeywords = this.skills.map(skill => {
      const keywords = new Map();

      // Name words (high weight)
      this.tokenize(skill.name).forEach(w => keywords.set(w, (keywords.get(w) || 0) + 5));

      // Symptoms (high weight)
      (skill.symptoms || []).forEach(s => {
        this.tokenize(s).forEach(w => keywords.set(w, (keywords.get(w) || 0) + 4));
      });

      // Category (medium weight)
      this.tokenize(skill.category).forEach(w => keywords.set(w, (keywords.get(w) || 0) + 3));

      // Description words (medium weight)
      this.tokenize(skill.description).forEach(w => keywords.set(w, (keywords.get(w) || 0) + 2));

      // Input/output names (low weight)
      (skill.inputs || []).forEach(i => {
        this.tokenize(i).forEach(w => keywords.set(w, (keywords.get(w) || 0) + 1));
      });
      (skill.outputs || []).forEach(o => {
        this.tokenize(o).forEach(w => keywords.set(w, (keywords.get(w) || 0) + 1));
      });

      // Documentation words (low weight, sampled)
      if (skill.documentation) {
        this.tokenize(skill.documentation).slice(0, 200).forEach(w =>
          keywords.set(w, (keywords.get(w) || 0) + 1)
        );
      }

      return { skill, keywords };
    });
  }

  tokenize(text) {
    if (!text) return [];
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
      'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
      'before', 'after', 'above', 'below', 'between', 'and', 'but', 'or',
      'not', 'no', 'nor', 'so', 'yet', 'both', 'either', 'neither', 'each',
      'every', 'all', 'any', 'few', 'more', 'most', 'other', 'some', 'such',
      'than', 'too', 'very', 'just', 'about', 'this', 'that', 'these', 'those',
      'it', 'its', 'my', 'your', 'his', 'her', 'our', 'their', 'what', 'which',
      'who', 'whom', 'how', 'when', 'where', 'why', 'i', 'me', 'we', 'us',
      'you', 'he', 'she', 'they', 'them', 'if', 'then', 'else', 'also',
    ]);
    return text
      .toLowerCase()
      .replace(/[^a-z0-9_\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));
  }

  render() {
    this.container.innerHTML = `
      <div class="mapper view-enter">
        ${renderBreadcrumb([
          { label: 'Explorer', icon: 'account_tree', path: '/explorer' },
          { label: 'Skill Routing Test' },
        ])}
        <div class="mapper__header">
          <h1 class="mapper__title">Skill Routing Test</h1>
          <p class="mapper__subtitle">Enter any prompt to see which skills the routing system would invoke</p>
        </div>
        <div class="mapper__search-wrapper">
          <span class="material-symbols-outlined mapper__search-icon">science</span>
          <textarea
            class="mapper__search-textarea"
            id="mapper-input"
            placeholder="Try a prompt like: &#10;&#10;&quot;My query is running slowly and timing out after 30 minutes. How can I optimize it?&quot;&#10;&#10;&quot;Set up a daily pipeline from Cloud Storage to BigQuery&quot;&#10;&#10;&quot;I accidentally dropped a production table, how do I recover?&quot;"
            rows="3"
          ></textarea>
          <button class="mapper__analyze-btn" id="mapper-analyze-btn">
            <span class="material-symbols-outlined" style="font-size: 20px;">play_arrow</span>
            Analyze
          </button>
        </div>
        <div class="mapper__results" id="mapper-results">
          <div class="empty-state">
            <span class="material-symbols-outlined empty-state__icon">science</span>
            <div class="empty-state__title">Test the skill routing system</div>
            <div class="empty-state__description">
              Enter any data-oriented prompt above to simulate how the skill routing system would interpret it and which skill files it would invoke.
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const input = this.container.querySelector('#mapper-input');
    const analyzeBtn = this.container.querySelector('#mapper-analyze-btn');

    // Analyze on button click
    analyzeBtn.addEventListener('click', () => {
      this.query = input.value;
      this.analyzePrompt(this.query);
    });

    // Analyze on Enter (but allow Shift+Enter for newlines)
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.query = input.value;
        this.analyzePrompt(this.query);
      }
    });

    // Focus input
    input.focus();
  }

  analyzePrompt(prompt) {
    const results = this.container.querySelector('#mapper-results');

    if (!prompt || prompt.trim().length < 3) {
      results.innerHTML = `
        <div class="empty-state">
          <span class="material-symbols-outlined empty-state__icon">science</span>
          <div class="empty-state__title">Test the skill routing system</div>
          <div class="empty-state__description">
            Enter any data-oriented prompt above to simulate how the skill routing system would interpret it and which skill files it would invoke.
          </div>
        </div>
      `;
      return;
    }

    const promptTokens = this.tokenize(prompt);
    if (promptTokens.length === 0) {
      results.innerHTML = `
        <div class="empty-state">
          <span class="material-symbols-outlined empty-state__icon">warning</span>
          <div class="empty-state__title">Could not extract meaningful terms</div>
          <div class="empty-state__description">Try a more specific, data-oriented prompt.</div>
        </div>
      `;
      return;
    }

    // Score each skill
    const scored = [];
    for (const { skill, keywords } of this.skillKeywords) {
      let totalScore = 0;
      const matchedTerms = [];
      const matchReasons = [];

      for (const token of promptTokens) {
        // Exact match
        if (keywords.has(token)) {
          totalScore += keywords.get(token);
          if (!matchedTerms.includes(token)) matchedTerms.push(token);
        }

        // Partial match (token is substring of keyword or vice versa)
        for (const [kw, weight] of keywords) {
          if (kw !== token && (kw.includes(token) || token.includes(kw)) && kw.length > 3) {
            totalScore += Math.floor(weight * 0.5);
            if (!matchedTerms.includes(kw)) matchedTerms.push(kw);
          }
        }
      }

      if (totalScore > 0) {
        // Determine match reasons
        const promptLower = prompt.toLowerCase();
        for (const symptom of skill.symptoms || []) {
          if (promptLower.includes(symptom.toLowerCase())) {
            matchReasons.push({ type: 'symptom', text: symptom, weight: 'high' });
            totalScore += 10; // Bonus for full symptom match
          }
        }

        if (promptLower.includes(skill.name.toLowerCase())) {
          matchReasons.push({ type: 'name', text: skill.name, weight: 'high' });
          totalScore += 8;
        }

        // Check description phrase overlap
        const descWords = this.tokenize(skill.description);
        const overlapCount = descWords.filter(w => promptTokens.includes(w)).length;
        if (overlapCount >= 2) {
          matchReasons.push({ type: 'description', text: `${overlapCount} keyword matches in description`, weight: 'medium' });
        }

        // Check category match
        const catTokens = this.tokenize(skill.category);
        if (catTokens.some(t => promptTokens.includes(t))) {
          matchReasons.push({ type: 'category', text: this.formatCategory(skill.category), weight: 'medium' });
        }

        // Check input/output relevance
        const ioMatches = [...(skill.inputs || []), ...(skill.outputs || [])]
          .filter(io => promptTokens.some(t => io.toLowerCase().includes(t)));
        if (ioMatches.length > 0) {
          matchReasons.push({ type: 'io', text: ioMatches.join(', '), weight: 'low' });
        }

        // If no specific reasons but still scored, add generic
        if (matchReasons.length === 0) {
          matchReasons.push({ type: 'keywords', text: matchedTerms.slice(0, 5).join(', '), weight: 'low' });
        }

        scored.push({ skill, score: totalScore, matchedTerms, matchReasons });
      }
    }

    scored.sort((a, b) => b.score - a.score);

    // Normalize scores to percentages (top score = 100%)
    const maxScore = scored.length > 0 ? scored[0].score : 1;

    if (scored.length === 0) {
      results.innerHTML = `
        <div class="empty-state">
          <span class="material-symbols-outlined empty-state__icon">search_off</span>
          <div class="empty-state__title">No skills matched this prompt</div>
          <div class="empty-state__description">
            The routing system could not find relevant skills for this prompt. Try rephrasing or using more data-specific terminology.
          </div>
        </div>
      `;
      return;
    }

    // Find which routers would be involved
    const topSkillIds = new Set(scored.slice(0, 5).map(s => s.skill.id));
    const involvedRouters = this.metaSkillRouters.filter(
      r => r.sub_skills.some(id => topSkillIds.has(id))
    );

    // Render results
    let html = '';

    // Routing summary card
    html += `
      <div class="mapper__routing-summary">
        <div class="mapper__routing-summary-header">
          <span class="material-symbols-outlined" style="font-size: 20px; color: var(--google-blue);">route</span>
          <span class="mapper__routing-summary-title">Routing Analysis</span>
          <span class="chip chip--blue">${scored.length} skill${scored.length !== 1 ? 's' : ''} matched</span>
        </div>
        <div class="mapper__routing-summary-body">
          <div class="mapper__routing-tokens">
            <span class="mapper__routing-tokens-label">Extracted terms:</span>
            ${promptTokens.slice(0, 12).map(t =>
              `<span class="mapper__routing-token">${t}</span>`
            ).join('')}
            ${promptTokens.length > 12 ? `<span class="mapper__routing-token mapper__routing-token--more">+${promptTokens.length - 12} more</span>` : ''}
          </div>
          ${involvedRouters.length > 0 ? `
            <div class="mapper__routing-routers">
              <span class="mapper__routing-tokens-label">Routers invoked:</span>
              ${involvedRouters.map(r =>
                `<span class="chip chip--green" style="cursor: pointer;" data-router-nav="graph">
                  <span class="material-symbols-outlined" style="font-size: 14px;">hub</span>
                  ${r.name}
                </span>`
              ).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `;

    // Skill result cards
    html += scored.slice(0, 10).map(({ skill, score, matchReasons }, index) => {
      const confidence = Math.round((score / maxScore) * 100);
      const confidenceClass = confidence >= 70 ? 'high' : confidence >= 40 ? 'medium' : 'low';
      const isPrimary = index === 0;

      return `
        <div class="mapper__result-card ${isPrimary ? 'mapper__result-card--primary' : ''}" data-skill-id="${skill.id}">
          <div class="mapper__result-rank">
            <span class="mapper__result-rank-number">${index + 1}</span>
          </div>
          <div class="mapper__result-body">
            <div class="mapper__result-header">
              <span class="mapper__result-name">${skill.name}</span>
              <div class="mapper__result-badges">
                <span class="tier-badge tier-badge--${skill.tier}">Tier ${skill.tier}</span>
                <span class="mapper__confidence mapper__confidence--${confidenceClass}">${confidence}% match</span>
              </div>
            </div>
            <p class="mapper__result-description">${skill.description}</p>
            <div class="mapper__result-reasons">
              ${matchReasons.map(r => `
                <div class="mapper__result-reason">
                  <span class="material-symbols-outlined mapper__result-reason-icon mapper__result-reason-icon--${r.weight}">${this.getReasonIcon(r.type)}</span>
                  <span class="mapper__result-reason-label">${this.getReasonLabel(r.type)}:</span>
                  <span class="mapper__result-reason-text">${r.text}</span>
                </div>
              `).join('')}
            </div>
            <div class="mapper__result-footer">
              <span class="chip">${this.formatCategory(skill.category)}</span>
              <span class="chip chip--blue">
                <span class="material-symbols-outlined" style="font-size: 14px;">group</span>
                ${skill.owner}
              </span>
              ${skill.assets?.length ? `<span class="chip"><span class="material-symbols-outlined" style="font-size: 14px;">code</span> ${skill.assets.length} asset${skill.assets.length !== 1 ? 's' : ''}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    results.innerHTML = html;

    // Bind clicks
    results.querySelectorAll('.mapper__result-card').forEach(card => {
      card.addEventListener('click', () => {
        this.router.navigate(`/skill/${card.dataset.skillId}`);
      });
    });

    results.querySelectorAll('[data-router-nav="graph"]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.router.navigate('/graph');
      });
    });
  }

  getReasonIcon(type) {
    const icons = {
      symptom: 'healing',
      name: 'label',
      description: 'description',
      category: 'folder',
      io: 'swap_horiz',
      keywords: 'key',
    };
    return icons[type] || 'info';
  }

  getReasonLabel(type) {
    const labels = {
      symptom: 'Symptom match',
      name: 'Skill name match',
      description: 'Description',
      category: 'Category',
      io: 'Inputs/Outputs',
      keywords: 'Keyword overlap',
    };
    return labels[type] || 'Match';
  }

  formatCategory(cat) {
    return cat.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  destroy() {
    this.container.innerHTML = '';
  }
}
