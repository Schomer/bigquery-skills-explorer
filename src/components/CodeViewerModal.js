/**
 * BQ Skill Explorer — Code Viewer Modal
 * Full-screen overlay with syntax highlighting and line numbers.
 */

import hljs from 'highlight.js/lib/core';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';

// Register only the languages we need
hljs.registerLanguage('python', python);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('json', json);
hljs.registerLanguage('markdown', markdown);

const LANG_MAP = {
  py: 'python',
  python: 'python',
  sql: 'sql',
  json: 'json',
  md: 'markdown',
  markdown: 'markdown',
};

export class CodeViewerModal {
  constructor() {
    this.backdrop = null;
    this.modal = null;
    this.isOpen = false;
  }

  /**
   * Open the modal with code content.
   * @param {{ name: string, type: string, content: string }} asset
   */
  open(asset) {
    if (this.isOpen) this.close();

    // Create backdrop
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'modal-backdrop';
    this.backdrop.addEventListener('click', () => this.close());

    // Create modal
    this.modal = document.createElement('div');
    this.modal.className = 'code-modal';

    const lang = LANG_MAP[asset.type] || asset.type;
    const langLabel = lang.toUpperCase();

    // Highlight the code
    let highlighted;
    try {
      highlighted = hljs.highlight(asset.content, { language: lang }).value;
    } catch {
      highlighted = this.escapeHtml(asset.content);
    }

    // Generate line numbers
    const lineCount = asset.content.split('\n').length;
    const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1).join('\n');

    this.modal.innerHTML = `
      <div class="code-modal__header">
        <span class="material-symbols-outlined" style="color: var(--google-blue);">code</span>
        <span class="code-modal__filename">${asset.name}</span>
        <span class="code-modal__lang-badge">${langLabel}</span>
        <button class="code-modal__copy-btn" id="code-copy-btn">
          <span class="material-symbols-outlined" style="font-size: 18px;">content_copy</span>
          Copy
        </button>
        <button class="code-modal__close-btn" id="code-close-btn" aria-label="Close">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div class="code-modal__body">
        <div class="code-modal__code-wrapper">
          <div class="code-modal__line-numbers"><pre>${lineNumbers}</pre></div>
          <div class="code-modal__code">
            <pre><code class="hljs language-${lang}">${highlighted}</code></pre>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.backdrop);
    document.body.appendChild(this.modal);
    this.isOpen = true;

    // Trigger animation
    requestAnimationFrame(() => {
      this.backdrop.classList.add('modal-backdrop--visible');
      this.modal.classList.add('code-modal--visible');
    });

    // Bind close
    this.modal.querySelector('#code-close-btn').addEventListener('click', () => this.close());

    // Bind copy
    this.modal.querySelector('#code-copy-btn').addEventListener('click', () => {
      this.copyToClipboard(asset.content);
    });

    // Escape key
    this.escHandler = (e) => {
      if (e.key === 'Escape') this.close();
    };
    document.addEventListener('keydown', this.escHandler);
  }

  close() {
    if (!this.isOpen) return;

    this.backdrop?.classList.remove('modal-backdrop--visible');
    this.modal?.classList.remove('code-modal--visible');

    setTimeout(() => {
      this.backdrop?.remove();
      this.modal?.remove();
      this.backdrop = null;
      this.modal = null;
    }, 200);

    document.removeEventListener('keydown', this.escHandler);
    this.isOpen = false;
  }

  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      const btn = this.modal.querySelector('#code-copy-btn');
      btn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 18px;">check</span> Copied`;
      setTimeout(() => {
        if (btn) {
          btn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 18px;">content_copy</span> Copy`;
        }
      }, 2000);
    } catch {
      // Fallback: do nothing
    }
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// Singleton
export const codeViewer = new CodeViewerModal();
